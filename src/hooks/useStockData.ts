import { useCallback } from 'react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { stockDataProvider } from '@/providers/yahoo-finance'
import { calcPortfolioStatistics } from '@/utils/statistics'
import type { DataPeriod } from '@/types/portfolio'

function periodToDate(period: DataPeriod): Date {
  const now = new Date()
  return new Date(now.getFullYear() - period, now.getMonth(), now.getDate())
}

export function useStockData() {
  const {
    holdings,
    dataPeriod,
    priceCache,
    simulationParams,
    setPriceCache,
    setPortfolioStatistics,
    setIsFetchingData,
    setError,
  } = usePortfolioStore()

  /** 単一銘柄の株価データを取得（キャッシュあればスキップ） */
  const fetchStockPrices = useCallback(
    async (code: string, force = false) => {
      if (!force && priceCache[code]?.length) {
        return priceCache[code]
      }

      const from = periodToDate(dataPeriod)
      const to = new Date()
      const prices = await stockDataProvider.fetchHistoricalPrices(code, from, to)
      setPriceCache(code, prices)
      return prices
    },
    [dataPeriod, priceCache, setPriceCache],
  )

  /** 銘柄情報を取得 */
  const fetchStockInfo = useCallback(async (code: string) => {
    return stockDataProvider.fetchStockInfo(code)
  }, [])

  /** 全保有銘柄の株価データを取得し、統計量を計算 */
  const fetchAllAndCalcStats = useCallback(
    async (force = false) => {
      if (holdings.length === 0) {
        setPortfolioStatistics(null)
        return
      }

      setIsFetchingData(true)
      setError(null)

      try {
        const priceData: Record<string, Awaited<ReturnType<typeof fetchStockPrices>>> = {}

        await Promise.all(
          holdings.map(async (h) => {
            priceData[h.code] = await fetchStockPrices(h.code, force)
          }),
        )

        const stats = calcPortfolioStatistics(
          holdings,
          priceData,
          simulationParams.riskFreeRate,
        )
        setPortfolioStatistics(stats)
      } catch (err) {
        setError(err instanceof Error ? err.message : '株価データの取得に失敗しました')
      } finally {
        setIsFetchingData(false)
      }
    },
    [holdings, fetchStockPrices, simulationParams.riskFreeRate, setPortfolioStatistics, setIsFetchingData, setError],
  )

  return {
    fetchStockPrices,
    fetchStockInfo,
    fetchAllAndCalcStats,
  }
}
