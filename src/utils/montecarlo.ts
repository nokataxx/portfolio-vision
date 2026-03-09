import { NUM_SIMULATIONS } from '@/types/portfolio'
import type { SimulationResult } from '@/types/portfolio'

/** Box-Muller変換で標準正規分布の乱数を生成 */
function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/** パーセンタイル計算（ソート済み配列に対して） */
function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)
}

export interface StockParam {
  /** 現在の評価額（shares × currentPrice） */
  currentValue: number
  /** 年率期待リターン（対数） */
  annualReturn: number
  /** 年率ボラティリティ */
  annualVolatility: number
}

export interface MonteCarloInput {
  stocks: StockParam[]
  years: number
  annualAddition: number
  totalAcquisitionCost: number
  onProgress?: (percent: number) => void
}

/**
 * Phase 1: 各銘柄独立モデルのモンテカルロシミュレーション
 * GBM（幾何ブラウン運動）: S(t+dt) = S(t) * exp((μ - σ²/2)*dt + σ*√dt*Z)
 */
export function runMonteCarloSimulation(input: MonteCarloInput): SimulationResult {
  const { stocks, years, annualAddition, totalAcquisitionCost, onProgress } = input
  const numSimulations = NUM_SIMULATIONS
  const dt = 1 // 年単位ステップ

  // paths[year][simIndex] = ポートフォリオ評価額
  const paths: number[][] = Array.from({ length: years + 1 }, () => new Array(numSimulations))

  const totalCurrentValue = stocks.reduce((s, st) => s + st.currentValue, 0)

  // 各銘柄のウェイト
  const weights = stocks.map((st) =>
    totalCurrentValue > 0 ? st.currentValue / totalCurrentValue : 1 / stocks.length,
  )

  const progressInterval = Math.max(1, Math.floor(numSimulations / 100))

  for (let sim = 0; sim < numSimulations; sim++) {
    // 初期値
    paths[0][sim] = totalCurrentValue

    let portfolioValue = totalCurrentValue

    for (let year = 1; year <= years; year++) {
      // 各銘柄の成長をシミュレート
      let newValue = 0
      for (let s = 0; s < stocks.length; s++) {
        const { annualReturn: mu, annualVolatility: sigma } = stocks[s]
        const stockValue = portfolioValue * weights[s]
        const drift = (mu - 0.5 * sigma * sigma) * dt
        const diffusion = sigma * Math.sqrt(dt) * randn()
        newValue += stockValue * Math.exp(drift + diffusion)
      }

      // 年次追加投資
      newValue += annualAddition * 10000 // 万円→円

      portfolioValue = newValue
      paths[year][sim] = portfolioValue
    }

    if (onProgress && sim % progressInterval === 0) {
      onProgress(Math.round((sim / numSimulations) * 100))
    }
  }

  // 各年のパーセンタイルを計算
  const percentiles = []
  for (let year = 0; year <= years; year++) {
    const sorted = [...paths[year]].sort((a, b) => a - b)
    percentiles.push({
      year,
      p10: percentile(sorted, 10),
      p25: percentile(sorted, 25),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p90: percentile(sorted, 90),
    })
  }

  // 最終年の統計
  const finalSorted = [...paths[years]].sort((a, b) => a - b)
  const median = percentile(finalSorted, 50)
  const optimistic = percentile(finalSorted, 75)
  const pessimistic = percentile(finalSorted, 25)

  const belowPrincipal = finalSorted.filter((v) => v < totalAcquisitionCost).length
  const principalLossProbability = belowPrincipal / numSimulations

  const aboveDouble = finalSorted.filter((v) => v >= totalAcquisitionCost * 2).length
  const doubleProbability = aboveDouble / numSimulations

  const aboveTriple = finalSorted.filter((v) => v >= totalAcquisitionCost * 3).length
  const tripleProbability = aboveTriple / numSimulations

  onProgress?.(100)

  return {
    paths,
    percentiles,
    finalYear: {
      median,
      optimistic,
      pessimistic,
      principalLossProbability,
      doubleProbability,
      tripleProbability,
    },
  }
}
