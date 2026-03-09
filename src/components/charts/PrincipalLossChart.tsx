import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStore } from '@/store/portfolioStore'
import { formatYearQuarter } from '@/utils/format'

export function PrincipalLossChart() {
  const result = usePortfolioStore((s) => s.simulationResult)

  const data = useMemo(() => {
    if (!result?.principalLossByStep) return []

    return result.principalLossByStep.map((prob, step) => ({
      year: step / 4,
      probability: Math.round(prob * 1000) / 10,
    }))
  }, [result])

  if (!result?.principalLossByStep) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">元本割れ確率の推移</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
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
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              label={{ value: '%', angle: -90, position: 'insideLeft', offset: 10 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload as { year: number; probability: number } | undefined
                if (!d) return null
                const prob = d.probability
                const yearLabel = formatYearQuarter(d.year)
                return (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-medium">{yearLabel}</p>
                    <p className="text-muted-foreground">
                      元本割れ確率: <span className="font-medium text-foreground">{prob}%</span>
                    </p>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="probability"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
