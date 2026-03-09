import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
  '#ff7c43',
  '#a05195',
]

export function RiskContributionChart() {
  const portfolioStatistics = usePortfolioStore((s) => s.portfolioStatistics)
  const holdings = usePortfolioStore((s) => s.holdings)

  const data = useMemo(() => {
    if (!portfolioStatistics?.riskContributions || holdings.length < 2) return []

    return portfolioStatistics.riskContributions.map((rc) => {
      const holding = holdings.find((h) => h.code === rc.code)
      return {
        name: holding ? `${holding.code} ${holding.name}` : rc.code,
        value: Math.round(rc.contribution * 1000) / 10,
      }
    })
  }, [portfolioStatistics, holdings])

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">銘柄別リスク寄与度</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              label={({ name, value }) => `${String(name ?? '').split(' ')[0]} ${value}%`}
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((_entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]
                return (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-medium">{d?.name}</p>
                    <p className="text-muted-foreground">
                      リスク寄与度: <span className="font-medium text-foreground">{d?.value}%</span>
                    </p>
                  </div>
                )
              }}
            />
            <Legend
              formatter={(value) => <span className="text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
