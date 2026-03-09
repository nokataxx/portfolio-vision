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

export function PrincipalLossChart() {
  const result = usePortfolioStore((s) => s.simulationResult)

  const data = useMemo(() => {
    if (!result?.principalLossByYear) return []

    return result.principalLossByYear.map((prob, year) => ({
      year: `${year}年`,
      probability: Math.round(prob * 1000) / 10,
    }))
  }, [result])

  if (!result?.principalLossByYear) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">元本割れ確率の推移</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              label={{ value: '%', angle: -90, position: 'insideLeft', offset: 10 }}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, '元本割れ確率']}
            />
            <Line
              type="monotone"
              dataKey="probability"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
