import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStore } from '@/store/portfolioStore'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#a4de6c',
]

export function HistoricalPriceChart() {
  const holdings = usePortfolioStore((s) => s.holdings)
  const priceCache = usePortfolioStore((s) => s.priceCache)

  const data = useMemo(() => {
    if (holdings.length === 0) return []

    // 各銘柄の初日の価格で正規化（100基準）
    const normalizedSeries: Record<string, Record<string, number>> = {}
    const allDates = new Set<string>()

    for (const h of holdings) {
      const prices = priceCache[h.code]
      if (!prices?.length) continue

      const basePrice = prices[0].adjClose
      for (const p of prices) {
        const date = p.date
        allDates.add(date)
        if (!normalizedSeries[date]) normalizedSeries[date] = {}
        normalizedSeries[date][h.code] = (p.adjClose / basePrice) * 100
      }
    }

    const sortedDates = [...allDates].sort()

    // 表示を間引き（最大200点）
    const step = Math.max(1, Math.floor(sortedDates.length / 200))

    return sortedDates
      .filter((_, i) => i % step === 0 || i === sortedDates.length - 1)
      .map((date) => ({
        date,
        ...normalizedSeries[date],
      }))
  }, [holdings, priceCache])

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">過去株価の推移（正規化）</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              label={{ value: '指数(=100)', angle: -90, position: 'insideLeft', offset: 10 }}
            />
            <Tooltip
              labelFormatter={(label) => `${label}`}
              formatter={(value, name) => {
                const holding = holdings.find((h) => h.code === String(name))
                return [`${Number(value).toFixed(1)}`, `${name} ${holding?.name ?? ''}`]
              }}
              contentStyle={{ fontSize: 11 }}
              labelStyle={{ fontSize: 11 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => {
                const holding = holdings.find((h) => h.code === value)
                return `${value} ${holding?.name ?? ''}`
              }}
            />
            {holdings.map((h, i) => (
              <Line
                key={h.code}
                type="monotone"
                dataKey={h.code}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-1 text-xs text-muted-foreground">
          ※ 取得期間開始時を100として指数化
        </p>
      </CardContent>
    </Card>
  )
}
