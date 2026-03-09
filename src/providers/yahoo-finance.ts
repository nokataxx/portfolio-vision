import type { PriceData, StockDataProvider, StockInfo } from '@/types/portfolio'

/**
 * Yahoo Finance API プロバイダー
 * 日本株の株価データを取得する。
 * CORS回避のため Vite dev server のプロキシを経由する。
 */
export class YahooFinanceProvider implements StockDataProvider {
  private baseUrl = '/api/yahoo-finance'

  /** 東証銘柄コードを Yahoo Finance のティッカーに変換 */
  private toTicker(code: string): string {
    return `${code}.T`
  }

  async fetchHistoricalPrices(
    code: string,
    from: Date,
    to: Date,
  ): Promise<PriceData[]> {
    const ticker = this.toTicker(code)
    const period1 = Math.floor(from.getTime() / 1000)
    const period2 = Math.floor(to.getTime() / 1000)

    const url = `${this.baseUrl}/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `株価データの取得に失敗しました（${code}）: ${response.status}`,
      )
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]
    if (!result) {
      throw new Error(`銘柄コード ${code} のデータが見つかりません`)
    }

    const timestamps: number[] = result.timestamp ?? []
    const quotes = result.indicators?.quote?.[0] ?? {}
    const adjClose: number[] =
      result.indicators?.adjclose?.[0]?.adjclose ?? []

    return timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: quotes.open?.[i] ?? 0,
        high: quotes.high?.[i] ?? 0,
        low: quotes.low?.[i] ?? 0,
        close: quotes.close?.[i] ?? 0,
        volume: quotes.volume?.[i] ?? 0,
        adjClose: adjClose[i] ?? quotes.close?.[i] ?? 0,
      }))
      .filter((d) => d.close > 0)
  }

  async fetchStockInfo(code: string): Promise<StockInfo> {
    const ticker = this.toTicker(code)
    const url = `${this.baseUrl}/v8/finance/chart/${ticker}?range=1d&interval=1d`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `銘柄情報の取得に失敗しました（${code}）: ${response.status}`,
      )
    }

    const data = await response.json()
    const meta = data.chart?.result?.[0]?.meta
    if (!meta) {
      throw new Error(`銘柄コード ${code} が見つかりません`)
    }

    return {
      code,
      name: meta.shortName || meta.longName || meta.symbol || code,
    }
  }
}

/** デフォルトのプロバイダーインスタンス */
export const stockDataProvider: StockDataProvider = new YahooFinanceProvider()
