/** Box-Muller変換で標準正規分布の乱数を生成 */
function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)
}

export interface WorkerStockParam {
  currentValue: number
  annualReturn: number
  annualVolatility: number
}

export interface WorkerInput {
  stocks: WorkerStockParam[]
  years: number
  numSimulations: number
  annualAddition: number
  totalAcquisitionCost: number
  /** コレスキー下三角行列（相関考慮モデル使用時） */
  choleskyL?: number[][]
}

/**
 * 独立した正規乱数ベクトルにコレスキー因子を掛けて相関のある乱数を生成
 */
function generateCorrelatedRandoms(L: number[][], n: number): number[] {
  const z = new Array(n)
  for (let i = 0; i < n; i++) z[i] = randn()

  const result = new Array(n)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let j = 0; j <= i; j++) {
      sum += L[i][j] * z[j]
    }
    result[i] = sum
  }
  return result
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { stocks, years, numSimulations, annualAddition, totalAcquisitionCost, choleskyL } = e.data
  const dt = 1
  const useCorrelation = choleskyL != null && choleskyL.length === stocks.length

  const totalCurrentValue = stocks.reduce((s, st) => s + st.currentValue, 0)
  const weights = stocks.map((st) =>
    totalCurrentValue > 0 ? st.currentValue / totalCurrentValue : 1 / stocks.length,
  )

  const yearlyValues: number[][] = Array.from({ length: years + 1 }, () => [])
  const progressInterval = Math.max(1, Math.floor(numSimulations / 50))

  for (let sim = 0; sim < numSimulations; sim++) {
    let portfolioValue = totalCurrentValue
    yearlyValues[0].push(portfolioValue)

    for (let year = 1; year <= years; year++) {
      let newValue = 0

      if (useCorrelation) {
        // Phase 3: 相関考慮モデル — コレスキー分解で相関のある乱数を生成
        const correlatedZ = generateCorrelatedRandoms(choleskyL, stocks.length)
        for (let s = 0; s < stocks.length; s++) {
          const { annualReturn: mu, annualVolatility: sigma } = stocks[s]
          const stockValue = portfolioValue * weights[s]
          const drift = (mu - 0.5 * sigma * sigma) * dt
          const diffusion = sigma * Math.sqrt(dt) * correlatedZ[s]
          newValue += stockValue * Math.exp(drift + diffusion)
        }
      } else {
        // Phase 1: 独立モデル
        for (let s = 0; s < stocks.length; s++) {
          const { annualReturn: mu, annualVolatility: sigma } = stocks[s]
          const stockValue = portfolioValue * weights[s]
          const drift = (mu - 0.5 * sigma * sigma) * dt
          const diffusion = sigma * Math.sqrt(dt) * randn()
          newValue += stockValue * Math.exp(drift + diffusion)
        }
      }

      newValue += annualAddition * 10000
      portfolioValue = newValue
      yearlyValues[year].push(portfolioValue)
    }

    if (sim % progressInterval === 0) {
      self.postMessage({ type: 'progress', percent: Math.round((sim / numSimulations) * 100) })
    }
  }

  // パーセンタイル計算
  const percentiles = yearlyValues.map((values, year) => {
    const sorted = [...values].sort((a, b) => a - b)
    return {
      year,
      p10: percentile(sorted, 10),
      p25: percentile(sorted, 25),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p90: percentile(sorted, 90),
    }
  })

  // 最終年
  const finalSorted = [...yearlyValues[years]].sort((a, b) => a - b)
  const belowPrincipal = finalSorted.filter((v) => v < totalAcquisitionCost).length
  const aboveDouble = finalSorted.filter((v) => v >= totalAcquisitionCost * 2).length

  // 各年の元本割れ確率
  const principalLossByYear = yearlyValues.map((values) => {
    const below = values.filter((v) => v < totalAcquisitionCost).length
    return below / numSimulations
  })

  self.postMessage({
    type: 'result',
    result: {
      paths: yearlyValues,
      percentiles,
      finalYear: {
        median: percentile(finalSorted, 50),
        optimistic: percentile(finalSorted, 90),
        pessimistic: percentile(finalSorted, 10),
        principalLossProbability: belowPrincipal / numSimulations,
        doubleProbability: aboveDouble / numSimulations,
      },
      principalLossByYear,
    },
  })
}
