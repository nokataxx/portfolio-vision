import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStore } from '@/store/portfolioStore'

export function ValueProjectionChart() {
  const result = usePortfolioStore((s) => s.simulationResult)
  const stats = usePortfolioStore((s) => s.portfolioStatistics)

  const data = useMemo(() => {
    if (!result) return []

    return result.percentiles.map((p) => ({
      year: `${p.year}年`,
      p10: Math.round(p.p10 / 10000),
      p25: Math.round(p.p25 / 10000),
      p50: Math.round(p.p50 / 10000),
      p75: Math.round(p.p75 / 10000),
      p90: Math.round(p.p90 / 10000),
      // 帯表示用（差分）
      band_10_25: Math.round((p.p25 - p.p10) / 10000),
      band_25_50: Math.round((p.p50 - p.p25) / 10000),
      band_50_75: Math.round((p.p75 - p.p50) / 10000),
      band_75_90: Math.round((p.p90 - p.p75) / 10000),
      base_p10: Math.round(p.p10 / 10000),
    }))
  }, [result])

  if (!result || !stats) return null

  const costManYen = Math.round(stats.totalAcquisitionCost / 10000)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">評価額の年次推移</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              label={{ value: '万円', angle: -90, position: 'insideLeft', offset: 10 }}
            />
            <Tooltip
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  base_p10: '10%ile',
                  band_10_25: '10-25%ile帯',
                  band_25_50: '25-50%ile帯',
                  band_50_75: '50-75%ile帯',
                  band_75_90: '75-90%ile帯',
                  p50: '中央値',
                }
                return [`${value}万円`, labels[String(name)] ?? String(name)]
              }}
            />
            {/* 帯グラフ：p10をベースにスタック */}
            <Area
              type="monotone"
              dataKey="base_p10"
              stackId="1"
              fill="transparent"
              stroke="none"
            />
            <Area
              type="monotone"
              dataKey="band_10_25"
              stackId="1"
              fill="var(--chart-1)"
              fillOpacity={0.15}
              stroke="none"
            />
            <Area
              type="monotone"
              dataKey="band_25_50"
              stackId="1"
              fill="var(--chart-1)"
              fillOpacity={0.3}
              stroke="none"
            />
            <Area
              type="monotone"
              dataKey="band_50_75"
              stackId="1"
              fill="var(--chart-1)"
              fillOpacity={0.3}
              stroke="none"
            />
            <Area
              type="monotone"
              dataKey="band_75_90"
              stackId="1"
              fill="var(--chart-1)"
              fillOpacity={0.15}
              stroke="none"
            />
            {/* 中央値ライン */}
            <Area
              type="monotone"
              dataKey="p50"
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth={2}
            />
            {/* 元本ライン */}
            <ReferenceLine
              y={costManYen}
              stroke="var(--destructive)"
              strokeDasharray="5 5"
              label={{ value: `元本 ${costManYen}万円`, fill: 'var(--destructive)', fontSize: 11, position: 'right' }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded bg-(--chart-1)/30" />
            25-75%ile
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded bg-(--chart-1)/15" />
            10-90%ile
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 bg-chart-1" />
            中央値
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
