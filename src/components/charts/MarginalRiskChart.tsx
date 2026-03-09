import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStore } from '@/store/portfolioStore'

export function MarginalRiskChart() {
  const portfolioStatistics = usePortfolioStore((s) => s.portfolioStatistics)
  const holdings = usePortfolioStore((s) => s.holdings)

  const data = useMemo(() => {
    if (!portfolioStatistics?.marginalRiskContributions || holdings.length < 2) return []

    return portfolioStatistics.marginalRiskContributions.map((mrc) => {
      const holding = holdings.find((h) => h.code === mrc.code)
      return {
        name: holding ? `${holding.code}\n${holding.name}` : mrc.code,
        code: mrc.code,
        mcr: Math.round(mrc.mcr * 10000) / 100, // %表示
      }
    })
  }, [portfolioStatistics, holdings])

  if (data.length === 0) return null

  const avgMcr = data.reduce((sum, d) => sum + d.mcr, 0) / data.length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">限界リスク寄与（MCR）</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <XAxis
              dataKey="code"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${v}%`}
              width={48}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload as (typeof data)[number] | undefined
                if (!d) return null
                return (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-medium">{d.name.replace('\n', ' ')}</p>
                    <p className="text-muted-foreground">
                      MCR: <span className="font-medium text-foreground">{d.mcr.toFixed(2)}%</span>
                    </p>
                  </div>
                )
              }}
            />
            <ReferenceLine
              y={avgMcr}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              label={{
                value: `平均 ${avgMcr.toFixed(1)}%`,
                position: 'right',
                fontSize: 10,
                fill: 'var(--muted-foreground)',
              }}
            />
            <Bar dataKey="mcr" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.mcr >= avgMcr ? 'var(--chart-1)' : 'var(--chart-3)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          MCRが高い銘柄ほど、ウェイト増加時にポートフォリオリスクを押し上げる
        </p>
      </CardContent>
    </Card>
  )
}
