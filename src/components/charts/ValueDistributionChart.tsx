import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStore } from '@/store/portfolioStore'

export function ValueDistributionChart() {
  const result = usePortfolioStore((s) => s.simulationResult)
  const stats = usePortfolioStore((s) => s.portfolioStatistics)
  const params = usePortfolioStore((s) => s.simulationParams)

  const data = useMemo(() => {
    if (!result) return []

    const finalValues = result.paths[result.paths.length - 1]
    if (!finalValues?.length) return []

    // ヒストグラム用のビン作成
    const min = Math.min(...finalValues)
    const max = Math.max(...finalValues)
    const binCount = 40
    const binWidth = (max - min) / binCount

    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: min + i * binWidth,
      rangeLabel: `${((min + i * binWidth) / 10000).toFixed(0)}`,
      count: 0,
    }))

    for (const v of finalValues) {
      const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1)
      bins[idx].count++
    }

    return bins
  }, [result])

  if (!result || !stats) return null

  const costLine = stats.totalAcquisitionCost / 10000
  const p10 = result.finalYear.pessimistic / 10000
  const p50 = result.finalYear.median / 10000
  const p90 = result.finalYear.optimistic / 10000

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {params.years}年後の評価額分布
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barCategoryGap={0}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="rangeLabel"
              label={{ value: '万円', position: 'insideBottomRight', offset: -5 }}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => [`${value}回`, '頻度']}
              labelFormatter={(label) => `${label}万円`}
            />
            <Bar dataKey="count" fill="hsl(var(--chart-1))" />
            <ReferenceLine
              x={data.findIndex((d) => d.range / 10000 >= costLine)?.toString()}
              stroke="hsl(var(--destructive))"
              strokeDasharray="5 5"
              label={{ value: '元本', fill: 'hsl(var(--destructive))', fontSize: 11 }}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>悲観（10%ile）: {p10.toFixed(0)}万円</span>
          <span>中央値: {p50.toFixed(0)}万円</span>
          <span>楽観（90%ile）: {p90.toFixed(0)}万円</span>
        </div>
      </CardContent>
    </Card>
  )
}
