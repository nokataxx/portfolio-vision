import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStore } from '@/store/portfolioStore'
import { formatYearQuarter } from '@/utils/format'

const NUM_SAMPLE_PATHS = 20
const SAMPLE_PATH_COLORS = [
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function ValueProjectionChart() {
  const result = usePortfolioStore((s) => s.simulationResult)
  const stats = usePortfolioStore((s) => s.portfolioStatistics)

  // サンプルパスのインデックスを固定（結果が変わるたびに再計算）
  const sampleIndices = useMemo(() => {
    if (!result?.paths?.[0]) return []
    const totalSims = result.paths[0].length
    const step = Math.floor(totalSims / NUM_SAMPLE_PATHS)
    return Array.from({ length: NUM_SAMPLE_PATHS }, (_, i) => i * step)
  }, [result])

  const data = useMemo(() => {
    if (!result) return []

    return result.percentiles.map((p, stepIdx) => {
      const row: Record<string, number> = {
        year: p.year,
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
      }

      // サンプルパスの値を追加
      for (let i = 0; i < sampleIndices.length; i++) {
        const simIdx = sampleIndices[i]
        const val = result.paths[stepIdx]?.[simIdx]
        if (val != null) {
          row[`path_${i}`] = Math.round(val / 10000)
        }
      }

      return row
    })
  }, [result, sampleIndices])

  if (!result || !stats) return null

  const costManYen = Math.round(stats.totalAcquisitionCost / 10000)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">評価額の年次推移</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              type="number"
              domain={[0, 'dataMax']}
              ticks={Array.from({ length: (data.at(-1)?.year ?? 0) + 1 }, (_, i) => i)}
              tickFormatter={(v: number) => `${v}年`}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              label={{ value: '万円', angle: -90, position: 'insideLeft', offset: 10 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload as Record<string, number> | undefined
                if (!d) return null
                const yearLabel = formatYearQuarter(d.year ?? 0)
                return (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-medium">{yearLabel}</p>
                    <table className="border-separate border-spacing-x-2 border-spacing-y-0.5">
                      <tbody>
                        <tr className="text-muted-foreground">
                          <td className="text-right">90%ile</td>
                          <td className="text-right font-medium text-foreground">{d.p90?.toLocaleString()}</td>
                          <td>万円</td>
                        </tr>
                        <tr className="text-muted-foreground">
                          <td className="text-right">75%ile</td>
                          <td className="text-right font-medium text-foreground">{d.p75?.toLocaleString()}</td>
                          <td>万円</td>
                        </tr>
                        <tr className="font-bold" style={{ color: 'var(--chart-1)' }}>
                          <td className="text-right">中央値</td>
                          <td className="text-right">{d.p50?.toLocaleString()}</td>
                          <td>万円</td>
                        </tr>
                        <tr className="text-muted-foreground">
                          <td className="text-right">25%ile</td>
                          <td className="text-right font-medium text-foreground">{d.p25?.toLocaleString()}</td>
                          <td>万円</td>
                        </tr>
                        <tr className="text-muted-foreground">
                          <td className="text-right">10%ile</td>
                          <td className="text-right font-medium text-foreground">{d.p10?.toLocaleString()}</td>
                          <td>万円</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              }}
            />
            {/* サンプルパス（帯の後ろに描画） */}
            {sampleIndices.map((_, i) => (
              <Line
                key={`path_${i}`}
                type="monotone"
                dataKey={`path_${i}`}
                stroke={SAMPLE_PATH_COLORS[i % SAMPLE_PATH_COLORS.length]}
                strokeWidth={0.5}
                strokeOpacity={0.3}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}
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
            <Line
              type="monotone"
              dataKey="p50"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
            {/* 元本ライン */}
            <ReferenceLine
              y={costManYen}
              stroke="var(--destructive)"
              strokeDasharray="5 5"
              label={{ value: `元本 ${costManYen}万円`, fill: 'var(--destructive)', fontSize: 11, position: 'right' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
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
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 opacity-30" style={{ backgroundColor: 'var(--chart-3)' }} />
            サンプルパス（{NUM_SAMPLE_PATHS}本）
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
