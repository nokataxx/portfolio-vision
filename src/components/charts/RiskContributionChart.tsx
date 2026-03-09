import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
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
  '#ff7c43',
  '#a05195',
]

export function RiskContributionChart() {
  const portfolioStatistics = usePortfolioStore((s) => s.portfolioStatistics)
  const holdings = usePortfolioStore((s) => s.holdings)

  const { riskData, returnData } = useMemo(() => {
    if (!portfolioStatistics?.riskContributions || holdings.length < 2) {
      return { riskData: [], returnData: [] }
    }

    const riskData = portfolioStatistics.riskContributions.map((rc) => {
      const holding = holdings.find((h) => h.code === rc.code)
      return {
        name: holding ? `${holding.code} ${holding.name}` : rc.code,
        value: Math.round(rc.contribution * 1000) / 10,
      }
    })

    // リターン寄与度の計算: wi × μi / Σ(wj × μj)
    const stats = portfolioStatistics.stockStatistics
    const totalMarketValue = portfolioStatistics.totalMarketValue

    const weightedReturns = holdings.map((h) => {
      const stat = stats.find((s) => s.code === h.code)
      if (!stat) return { code: h.code, name: h.name, wr: 0 }
      const marketValue = stat.currentPrice * h.shares
      const weight = marketValue / totalMarketValue
      return { code: h.code, name: h.name, wr: weight * stat.annualReturn }
    })

    const totalWeightedReturn = weightedReturns.reduce((sum, w) => sum + w.wr, 0)

    const returnData = weightedReturns.map((w) => {
      const contribution = totalWeightedReturn !== 0 ? w.wr / totalWeightedReturn : 0
      return {
        name: `${w.code} ${w.name}`,
        value: Math.round(contribution * 1000) / 10,
      }
    })

    return { riskData, returnData }
  }, [portfolioStatistics, holdings])

  if (riskData.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">銘柄別リスク・リターン寄与度</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-center text-xs font-medium text-muted-foreground">
              リスク寄与度
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${String(name ?? '').split(' ')[0]} ${value}%`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {riskData.map((_entry, index) => (
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
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="mb-1 text-center text-xs font-medium text-muted-foreground">
              リターン寄与度
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={returnData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${String(name ?? '').split(' ')[0]} ${value}%`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {returnData.map((_entry, index) => (
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
                          リターン寄与度: <span className="font-medium text-foreground">{d?.value}%</span>
                        </p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
          {riskData.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {entry.name}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
