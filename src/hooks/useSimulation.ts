import { useCallback, useRef } from 'react'
import { usePortfolioStore } from '@/store/portfolioStore'
import type { SimulationResult } from '@/types/portfolio'

interface WorkerResult {
  type: 'progress' | 'result'
  percent?: number
  result?: SimulationResult & { principalLossByYear: number[] }
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
        // principalLossByYear を store の SimulationResult に含めるため拡張
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

    worker.postMessage({
      stocks,
      years: simulationParams.years,
      numSimulations: simulationParams.numSimulations,
      annualAddition: simulationParams.annualAddition,
      totalAcquisitionCost: portfolioStatistics.totalAcquisitionCost,
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
