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
  const {
    holdings,
    simulationParams,
    portfolioStatistics,
    setSimulationResult,
    setIsSimulating,
    setSimulationProgress,
    setError,
  } = usePortfolioStore()

  const runSimulation = useCallback(() => {
    if (!portfolioStatistics || holdings.length === 0) {
      setError('銘柄を登録し、株価データを取得してから実行してください')
      return
    }

    // 既存の Worker を終了
    if (workerRef.current) {
      workerRef.current.terminate()
    }

    setIsSimulating(true)
    setSimulationProgress(0)
    setSimulationResult(null)
    setError(null)

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
        setSimulationProgress(data.percent ?? 0)
      } else if (data.type === 'result' && data.result) {
        // principalLossByStep を store の SimulationResult に含めるため拡張
        setSimulationResult(data.result)
        setIsSimulating(false)
        setSimulationProgress(100)
        worker.terminate()
        workerRef.current = null
      }
    }

    worker.onerror = (err) => {
      setError(`シミュレーション実行中にエラーが発生しました: ${err.message}`)
      setIsSimulating(false)
      worker.terminate()
      workerRef.current = null
    }

    // Phase 3: 相関考慮モデルの場合、コレスキー因子を計算して渡す
    let choleskyL: number[][] | undefined
    if (simulationParams.useCorrelation && holdings.length >= 2) {
      const priceCache = usePortfolioStore.getState().priceCache
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
  }, [
    holdings,
    simulationParams,
    portfolioStatistics,
    setSimulationResult,
    setIsSimulating,
    setSimulationProgress,
    setError,
  ])

  const cancelSimulation = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
      setIsSimulating(false)
    }
  }, [setIsSimulating])

  return { runSimulation, cancelSimulation }
}
