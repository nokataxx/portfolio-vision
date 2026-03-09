import { useCallback, useRef } from 'react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { calcLogReturns, calcCovarianceMatrix, choleskyDecompose } from '@/utils/statistics'
import { NUM_SIMULATIONS } from '@/types/portfolio'
import type { SimulationResult } from '@/types/portfolio'

interface WorkerResult {
  type: 'progress' | 'result'
  percent?: number
  result?: SimulationResult & { principalLossByStep: number[] }
}

export function useSimulation() {
  const workerRef = useRef<Worker | null>(null)
  const lastProgressRef = useRef(0)

  const runSimulation = useCallback(() => {
    const state = usePortfolioStore.getState()
    const { holdings, simulationParams, portfolioStatistics } = state

    if (!portfolioStatistics || holdings.length === 0) {
      state.setError('銘柄を登録し、株価データを取得してから実行してください')
      return
    }

    // 既存の Worker を終了
    if (workerRef.current) {
      workerRef.current.terminate()
    }

    state.setIsSimulating(true)
    state.setSimulationProgress(0)
    state.setSimulationResult(null)
    state.setError(null)
    lastProgressRef.current = 0

    const worker = new Worker(
      new URL('../workers/simulation.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    const stocks = holdings.map((h, i) => {
      const stats = portfolioStatistics.stockStatistics[i]
      return {
        currentValue: h.shares * stats.currentPrice,
        annualReturn: stats.annualReturn,
        annualVolatility: stats.annualVolatility,
      }
    })

    worker.onmessage = (e: MessageEvent<WorkerResult>) => {
      const data = e.data
      if (data.type === 'progress') {
        // 進捗更新を5%刻みにスロットル
        const percent = data.percent ?? 0
        if (percent - lastProgressRef.current >= 5 || percent >= 100) {
          lastProgressRef.current = percent
          usePortfolioStore.getState().setSimulationProgress(percent)
        }
      } else if (data.type === 'result' && data.result) {
        const s = usePortfolioStore.getState()
        s.setSimulationResult(data.result)
        s.setIsSimulating(false)
        s.setSimulationProgress(100)
        worker.terminate()
        workerRef.current = null
      }
    }

    worker.onerror = (err) => {
      const s = usePortfolioStore.getState()
      s.setError(`シミュレーション実行中にエラーが発生しました: ${err.message}`)
      s.setIsSimulating(false)
      worker.terminate()
      workerRef.current = null
    }

    // Phase 3: 相関考慮モデルの場合、コレスキー因子を計算して渡す
    let choleskyL: number[][] | undefined
    if (simulationParams.useCorrelation && holdings.length >= 2) {
      const priceCache = state.priceCache
      const returnSeries = holdings.map((h) => calcLogReturns(priceCache[h.code] ?? []))
      const TRADING_DAYS = 245
      const dailyCov = calcCovarianceMatrix(returnSeries)
      const annCov = dailyCov.map((row) => row.map((v) => v * TRADING_DAYS))
      choleskyL = choleskyDecompose(annCov)
    }

    worker.postMessage({
      stocks,
      years: simulationParams.years,
      numSimulations: NUM_SIMULATIONS,
      annualAddition: simulationParams.annualAddition,
      totalAcquisitionCost: portfolioStatistics.totalAcquisitionCost,
      choleskyL,
    })
  }, [])

  const cancelSimulation = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
      usePortfolioStore.getState().setIsSimulating(false)
    }
  }, [])

  return { runSimulation, cancelSimulation }
}
