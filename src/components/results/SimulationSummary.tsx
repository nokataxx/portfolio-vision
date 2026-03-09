import { Card, CardContent } from '@/components/ui/card'
import { usePortfolioStore } from '@/store/portfolioStore'
import { Target, TrendingUp, TrendingDown, AlertTriangle, Sparkles } from 'lucide-react'

function formatManYen(value: number): string {
  return `${(value / 10000).toFixed(1)}万円`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

interface SummaryItemProps {
  label: string
  value: string
  icon: React.ReactNode
  valueColor?: string
}

function SummaryItem({ label, value, icon, valueColor }: SummaryItemProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-bold ${valueColor ?? ''}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function SimulationSummary() {
  const result = usePortfolioStore((s) => s.simulationResult)
  const params = usePortfolioStore((s) => s.simulationParams)

  if (!result) return null

  const { finalYear } = result

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        シミュレーション結果（{params.years}年後）
      </h3>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryItem
          label="期待評価額（中央値）"
          value={formatManYen(finalYear.median)}
          icon={<Target className="h-5 w-5 text-blue-500" />}
        />
        <SummaryItem
          label="楽観シナリオ（90%ile）"
          value={formatManYen(finalYear.optimistic)}
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          valueColor="text-green-600"
        />
        <SummaryItem
          label="悲観シナリオ（10%ile）"
          value={formatManYen(finalYear.pessimistic)}
          icon={<TrendingDown className="h-5 w-5 text-red-500" />}
          valueColor="text-red-600"
        />
        <SummaryItem
          label="元本割れ確率"
          value={formatPercent(finalYear.principalLossProbability)}
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          valueColor={
            finalYear.principalLossProbability > 0.3
              ? 'text-red-600'
              : finalYear.principalLossProbability > 0.1
                ? 'text-amber-600'
                : 'text-green-600'
          }
        />
        <SummaryItem
          label="2倍達成確率"
          value={formatPercent(finalYear.doubleProbability)}
          icon={<Sparkles className="h-5 w-5 text-purple-500" />}
          valueColor="text-purple-600"
        />
      </div>
    </div>
  )
}
