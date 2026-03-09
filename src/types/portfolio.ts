/** 株価データの1日分 */
export interface PriceData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjClose: number
}

/** 銘柄情報 */
export interface StockInfo {
  code: string
  name: string
}

/** ポートフォリオの1銘柄 */
export interface StockHolding {
  id: string
  code: string
  name: string
  shares: number
  acquisitionPrice: number
}

/** 個別銘柄の統計量 */
export interface StockStatistics {
  code: string
  annualReturn: number
  annualVolatility: number
  sharpeRatio: number
  maxDrawdown: number
  currentPrice: number
}

/** ポートフォリオ全体の統計量 */
export interface PortfolioStatistics {
  totalMarketValue: number
  totalAcquisitionCost: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  expectedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  correlationMatrix: number[][]
  riskContributions: { code: string; contribution: number }[]
  stockStatistics: StockStatistics[]
}

/** シミュレーションパラメータ */
export interface SimulationParams {
  years: number
  numSimulations: number
  annualAddition: number
  riskFreeRate: number
}

/** シミュレーション結果 */
export interface SimulationResult {
  /** 各年の各シミュレーションパスの評価額 [year][path] */
  paths: number[][]
  /** 各年のパーセンタイル値 */
  percentiles: {
    year: number
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }[]
  /** 最終年の統計 */
  finalYear: {
    median: number
    optimistic: number
    pessimistic: number
    principalLossProbability: number
    doubleProbability: number
  }
  /** 各年の元本割れ確率 */
  principalLossByYear?: number[]
}

/** 株価データ取得プロバイダーのインターフェース */
export interface StockDataProvider {
  fetchHistoricalPrices(
    code: string,
    from: Date,
    to: Date,
  ): Promise<PriceData[]>
  fetchStockInfo(code: string): Promise<StockInfo>
}

/** データ取得期間の選択肢 */
export type DataPeriod = 3 | 5 | 10
