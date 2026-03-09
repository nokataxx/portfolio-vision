import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStore } from '@/store/portfolioStore'

/** 相関係数を色に変換（青 → 白 → 赤） */
function correlationColor(value: number): string {
  // -1: 青 (210, 60%, 50%) → 0: 白 → +1: 赤 (0, 70%, 50%)
  if (value >= 0) {
    const intensity = Math.min(value, 1)
    const r = 255
    const g = Math.round(255 * (1 - intensity * 0.7))
    const b = Math.round(255 * (1 - intensity * 0.8))
    return `rgb(${r}, ${g}, ${b})`
  } else {
    const intensity = Math.min(-value, 1)
    const r = Math.round(255 * (1 - intensity * 0.7))
    const g = Math.round(255 * (1 - intensity * 0.5))
    const b = 255
    return `rgb(${r}, ${g}, ${b})`
  }
}

/** 対角線のボラティリティ表示用の色 */
function volatilityColor(vol: number): string {
  // 低ボラ（~10%）: 緑系、高ボラ（~50%+）: 赤系
  const t = Math.min(vol / 0.5, 1)
  const r = Math.round(100 + 155 * t)
  const g = Math.round(180 * (1 - t * 0.6))
  const b = Math.round(100 * (1 - t))
  return `rgb(${r}, ${g}, ${b})`
}

export function CorrelationMatrixChart() {
  const portfolioStatistics = usePortfolioStore((s) => s.portfolioStatistics)
  const holdings = usePortfolioStore((s) => s.holdings)

  const { labels, matrix, volatilities, weightedAvgCorrelation, diversificationRatio } = useMemo(() => {
    if (!portfolioStatistics?.correlationMatrix || holdings.length < 2) {
      return { labels: [], matrix: [], volatilities: [], weightedAvgCorrelation: 0, diversificationRatio: 0 }
    }

    const labels = holdings.map((h) => h.code)
    const matrix = portfolioStatistics.correlationMatrix
    const volatilities = portfolioStatistics.stockStatistics.map(
      (s) => s.annualVolatility,
    )

    // ウェイト計算
    const marketValues = holdings.map(
      (h, i) => h.shares * portfolioStatistics.stockStatistics[i].currentPrice,
    )
    const totalValue = marketValues.reduce((s, v) => s + v, 0)
    const weights = marketValues.map((v) => (totalValue > 0 ? v / totalValue : 0))

    // 加重平均相関
    const n = labels.length
    let weightedCorrSum = 0
    let weightSum = 0
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const w = weights[i] * weights[j]
        weightedCorrSum += w * matrix[i][j]
        weightSum += w
      }
    }
    const weightedAvgCorrelation = weightSum > 0 ? weightedCorrSum / weightSum : 0

    // 分散比率 = 個別ボラティリティの加重平均 / ポートフォリオ全体のボラティリティ
    const weightedVolSum = weights.reduce(
      (sum, w, i) => sum + w * volatilities[i],
      0,
    )
    const diversificationRatio =
      portfolioStatistics.volatility > 0
        ? weightedVolSum / portfolioStatistics.volatility
        : 1

    return { labels, matrix, volatilities, weightedAvgCorrelation, diversificationRatio }
  }, [portfolioStatistics, holdings])

  if (labels.length === 0) return null

  const n = labels.length
  const cellSize = Math.min(64, Math.max(40, 320 / n))
  const labelWidth = 56
  const legendWidth = 60
  const totalWidth = labelWidth + n * cellSize + legendWidth
  const totalHeight = 24 + n * cellSize

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">銘柄間相関行列</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg
            width={totalWidth}
            height={totalHeight}
            className="mx-auto block"
          >
            {/* 列ヘッダー */}
            {labels.map((label, j) => (
              <text
                key={`col-${j}`}
                x={labelWidth + j * cellSize + cellSize / 2}
                y={16}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-medium"
              >
                {label}
              </text>
            ))}

            {/* 行 */}
            {labels.map((rowLabel, i) => (
              <g key={`row-${i}`}>
                {/* 行ラベル */}
                <text
                  x={labelWidth - 8}
                  y={24 + i * cellSize + cellSize / 2 + 4}
                  textAnchor="end"
                  className="fill-foreground text-[11px] font-medium"
                >
                  {rowLabel}
                </text>

                {/* セル */}
                {labels.map((_colLabel, j) => {
                  const isDiagonal = i === j
                  const value = matrix[i][j]
                  const bg = isDiagonal
                    ? volatilityColor(volatilities[i])
                    : correlationColor(value)
                  const displayValue = isDiagonal
                    ? `${(volatilities[i] * 100).toFixed(1)}%`
                    : value.toFixed(2)

                  return (
                    <g key={`cell-${i}-${j}`}>
                      <rect
                        x={labelWidth + j * cellSize}
                        y={24 + i * cellSize}
                        width={cellSize}
                        height={cellSize}
                        fill={bg}
                        stroke="var(--border)"
                        strokeWidth={0.5}
                        rx={2}
                      />
                      <text
                        x={labelWidth + j * cellSize + cellSize / 2}
                        y={24 + i * cellSize + cellSize / 2 + 4}
                        textAnchor="middle"
                        className={`text-[10px] font-medium ${
                          isDiagonal ? 'fill-white' : 'fill-foreground'
                        }`}
                      >
                        {displayValue}
                      </text>
                    </g>
                  )
                })}
              </g>
            ))}

            {/* 凡例 */}
            <g transform={`translate(${labelWidth + n * cellSize + 12}, 24)`}>
              <defs>
                <linearGradient id="corr-gradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor={correlationColor(-1)} />
                  <stop offset="50%" stopColor={correlationColor(0)} />
                  <stop offset="100%" stopColor={correlationColor(1)} />
                </linearGradient>
              </defs>
              <rect
                width={12}
                height={n * cellSize}
                fill="url(#corr-gradient)"
                rx={2}
                stroke="var(--border)"
                strokeWidth={0.5}
              />
              <text
                x={18}
                y={10}
                className="fill-muted-foreground text-[9px]"
              >
                +1
              </text>
              <text
                x={18}
                y={(n * cellSize) / 2 + 3}
                className="fill-muted-foreground text-[9px]"
              >
                0
              </text>
              <text
                x={18}
                y={n * cellSize}
                className="fill-muted-foreground text-[9px]"
              >
                −1
              </text>
            </g>
          </svg>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          対角線はボラティリティ（年率）を表示
        </p>
        <div className="mt-2 flex justify-center gap-6 text-sm text-muted-foreground">
          <div>
            <span className="mr-1">加重平均相関:</span>
            <span className="font-semibold text-foreground">
              {weightedAvgCorrelation.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="mr-1">分散比率:</span>
            <span className="font-semibold text-foreground">
              {diversificationRatio.toFixed(2)}
            </span>
            <span className="ml-1 text-[10px]">
              ({diversificationRatio >= 1.5 ? '高い分散効果' : diversificationRatio >= 1.2 ? 'やや分散効果あり' : '分散効果が限定的'})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
