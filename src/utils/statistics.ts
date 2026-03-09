import type { PriceData, StockStatistics, PortfolioStatistics, StockHolding } from '@/types/portfolio'

const TRADING_DAYS_PER_YEAR = 245

/** 調整後終値から日次対数リターンを計算 */
export function calcLogReturns(prices: PriceData[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1].adjClose
    const curr = prices[i].adjClose
    if (prev > 0 && curr > 0) {
      returns.push(Math.log(curr / prev))
    }
  }
  return returns
}

/** 平均値 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** 標準偏差（不偏） */
export function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/** 年率平均リターン */
export function annualizedReturn(dailyReturns: number[]): number {
  return mean(dailyReturns) * TRADING_DAYS_PER_YEAR
}

/** 年率ボラティリティ */
export function annualizedVolatility(dailyReturns: number[]): number {
  return stddev(dailyReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR)
}

/** シャープレシオ */
export function sharpeRatio(
  annReturn: number,
  annVol: number,
  riskFreeRate: number,
): number {
  if (annVol === 0) return 0
  return (annReturn - riskFreeRate) / annVol
}

/** 最大ドローダウン（調整後終値ベース） */
export function maxDrawdown(prices: PriceData[]): number {
  if (prices.length === 0) return 0
  let peak = prices[0].adjClose
  let maxDd = 0
  for (const p of prices) {
    if (p.adjClose > peak) peak = p.adjClose
    const dd = (peak - p.adjClose) / peak
    if (dd > maxDd) maxDd = dd
  }
  return maxDd
}

/** 個別銘柄の統計量を計算 */
export function calcStockStatistics(
  code: string,
  prices: PriceData[],
  riskFreeRate: number,
): StockStatistics {
  const logReturns = calcLogReturns(prices)
  const annReturn = annualizedReturn(logReturns)
  const annVol = annualizedVolatility(logReturns)

  return {
    code,
    annualReturn: annReturn,
    annualVolatility: annVol,
    sharpeRatio: sharpeRatio(annReturn, annVol, riskFreeRate),
    maxDrawdown: maxDrawdown(prices),
    currentPrice: prices.length > 0 ? prices[prices.length - 1].adjClose : 0,
  }
}

/** 2系列の共分散 */
function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0
  const ma = mean(a)
  const mb = mean(b)
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += (a[i] - ma) * (b[i] - mb)
  }
  return sum / (n - 1)
}

/** 相関係数行列を計算 */
export function calcCorrelationMatrix(returnSeries: number[][]): number[][] {
  const n = returnSeries.length
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  const stds = returnSeries.map((r) => stddev(r))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1
      } else if (j > i) {
        const cov = covariance(returnSeries[i], returnSeries[j])
        const corr = stds[i] > 0 && stds[j] > 0 ? cov / (stds[i] * stds[j]) : 0
        matrix[i][j] = corr
        matrix[j][i] = corr
      }
    }
  }
  return matrix
}

/** 共分散行列を計算 */
export function calcCovarianceMatrix(returnSeries: number[][]): number[][] {
  const n = returnSeries.length
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const cov = covariance(returnSeries[i], returnSeries[j])
      matrix[i][j] = cov
      matrix[j][i] = cov
    }
  }
  return matrix
}

/**
 * コレスキー分解: 対称正定値行列 A を下三角行列 L に分解する (A = L * L')
 * 相関のある多変量正規乱数の生成に使用
 */
export function choleskyDecompose(matrix: number[][]): number[][] {
  const n = matrix.length
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k]
      }
      if (i === j) {
        const diag = matrix[i][i] - sum
        // 数値的に負になる可能性があるため0でクランプ
        L[i][j] = Math.sqrt(Math.max(0, diag))
      } else {
        L[i][j] = L[j][j] > 0 ? (matrix[i][j] - sum) / L[j][j] : 0
      }
    }
  }
  return L
}

/** ポートフォリオ全体の統計量を計算 */
export function calcPortfolioStatistics(
  holdings: StockHolding[],
  priceData: Record<string, PriceData[]>,
  riskFreeRate: number,
): PortfolioStatistics {
  const stockStats = holdings.map((h) =>
    calcStockStatistics(h.code, priceData[h.code] ?? [], riskFreeRate),
  )

  // 時価評価
  const totalMarketValue = holdings.reduce((sum, h, i) => {
    return sum + h.shares * stockStats[i].currentPrice
  }, 0)

  const totalAcquisitionCost = holdings.reduce(
    (sum, h) => sum + h.shares * h.acquisitionPrice,
    0,
  )

  // ウェイト計算
  const weights = holdings.map((h, i) => {
    const value = h.shares * stockStats[i].currentPrice
    return totalMarketValue > 0 ? value / totalMarketValue : 0
  })

  // 日次リターン系列
  const returnSeries = holdings.map((h) => calcLogReturns(priceData[h.code] ?? []))

  // 年率化した共分散行列
  const dailyCovMatrix = calcCovarianceMatrix(returnSeries)
  const annCovMatrix = dailyCovMatrix.map((row) =>
    row.map((v) => v * TRADING_DAYS_PER_YEAR),
  )

  // ポートフォリオの年率期待リターン（加重平均）
  const expectedReturn = weights.reduce(
    (sum, w, i) => sum + w * stockStats[i].annualReturn,
    0,
  )

  // ポートフォリオの年率ボラティリティ（w' * Σ * w）
  let portfolioVariance = 0
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      portfolioVariance += weights[i] * weights[j] * (annCovMatrix[i]?.[j] ?? 0)
    }
  }
  const volatility = Math.sqrt(Math.max(0, portfolioVariance))

  // リスク寄与度
  const riskContributions = holdings.map((h, i) => {
    let marginalContrib = 0
    for (let j = 0; j < weights.length; j++) {
      marginalContrib += weights[j] * (annCovMatrix[i]?.[j] ?? 0)
    }
    const contrib = volatility > 0 ? (weights[i] * marginalContrib) / portfolioVariance : 0
    return { code: h.code, contribution: contrib }
  })

  // ポートフォリオの最大ドローダウン（加重平均の概算）
  const portfolioMaxDd = weights.reduce(
    (sum, w, i) => sum + w * stockStats[i].maxDrawdown,
    0,
  )

  const correlationMatrix = calcCorrelationMatrix(returnSeries)

  const unrealizedPnL = totalMarketValue - totalAcquisitionCost

  return {
    totalMarketValue,
    totalAcquisitionCost,
    unrealizedPnL,
    unrealizedPnLPercent: totalAcquisitionCost > 0 ? unrealizedPnL / totalAcquisitionCost : 0,
    expectedReturn,
    volatility,
    sharpeRatio: sharpeRatio(expectedReturn, volatility, riskFreeRate),
    maxDrawdown: portfolioMaxDd,
    correlationMatrix,
    riskContributions,
    stockStatistics: stockStats,
  }
}
