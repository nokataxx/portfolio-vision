import type { PriceData, StockDataProvider, StockInfo } from '@/types/portfolio'

/**
 * Stooq プロバイダー
 * 日本株の株価データを Stooq から取得する。
 * 認証不要・無料の CSV API を使用。
 * CORS 回避のため Vite dev server のプロキシを経由する。
 */
export class YahooFinanceProvider implements StockDataProvider {
  private baseUrl = '/api/stooq'

  /** 東証銘柄コードを Stooq のシンボルに変換 */
  private toSymbol(code: string): string {
    return `${code}.jp`
  }

  /** Date を yyyymmdd 形式に変換 */
  private formatDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }

  async fetchHistoricalPrices(
    code: string,
    from: Date,
    to: Date,
  ): Promise<PriceData[]> {
    const symbol = this.toSymbol(code)
    const d1 = this.formatDate(from)
    const d2 = this.formatDate(to)

    const url = `${this.baseUrl}/q/d/l/?s=${symbol}&d1=${d1}&d2=${d2}&i=d`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `株価データの取得に失敗しました（${code}）: ${response.status}`,
      )
    }

    const text = await response.text()
    const lines = text.trim().split('\n')

    if (lines.length < 2) {
      throw new Error(`銘柄コード ${code} のデータが見つかりません`)
    }

    // ヘッダー行をスキップ: Date,Open,High,Low,Close,Volume
    const prices: PriceData[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',')
      if (cols.length < 6) continue

      const close = parseFloat(cols[4])
      if (close <= 0 || isNaN(close)) continue

      prices.push({
        date: cols[0],
        open: parseFloat(cols[1]),
        high: parseFloat(cols[2]),
        low: parseFloat(cols[3]),
        close,
        volume: parseInt(cols[5], 10) || 0,
        adjClose: close, // Stooq の Close は調整済み
      })
    }

    if (prices.length === 0) {
      throw new Error(`銘柄コード ${code} のデータが見つかりません`)
    }

    return prices
  }

  async fetchStockInfo(code: string): Promise<StockInfo> {
    const symbol = this.toSymbol(code)

    // Stooq の HTML ページから銘柄名を取得
    const url = `${this.baseUrl}/q/?s=${symbol}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `銘柄情報の取得に失敗しました（${code}）: ${response.status}`,
      )
    }

    const html = await response.text()

    // <title>7203.JP (+0.98%) - Toyota Motor Co. - Stooq</title>
    const titleMatch = html.match(/<title>[^<]*-\s*(.+?)\s*-\s*Stooq<\/title>/)
    const name = titleMatch?.[1]?.trim() || code

    // タイトルに銘柄名が含まれていない場合（無効なコード）
    if (html.includes('Unknown symbol') || html.includes('No data')) {
      throw new Error(`銘柄コード ${code} が見つかりません`)
    }

    return { code, name }
  }
}

/** デフォルトのプロバイダーインスタンス */
export const stockDataProvider: StockDataProvider = new YahooFinanceProvider()
