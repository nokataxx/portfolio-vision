import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStore } from '@/store/portfolioStore'
import { TrendingUp, TrendingDown, BarChart3, Shield } from 'lucide-react'

function formatYen(value: number): string {
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}万円`
  }
  return `¥${value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

interface StatCardProps {
  label: string
  value: string
  subValue?: string
  icon: React.ReactNode
  valueColor?: string
}

function StatCard({ label, value, subValue, icon, valueColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-bold ${valueColor ?? ''}`}>{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function PortfolioSummary() {
  const stats = usePortfolioStore((s) => s.portfolioStatistics)

  if (!stats) return null

  const pnlColor =
    stats.unrealizedPnL > 0
      ? 'text-green-600'
      : stats.unrealizedPnL < 0
        ? 'text-red-600'
        : ''

  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg">ポートフォリオサマリー</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="現在の評価額"
          value={formatYen(stats.totalMarketValue)}
          subValue={`取得価格: ${formatYen(stats.totalAcquisitionCost)}`}
          icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          label="含み損益"
          value={`${stats.unrealizedPnL >= 0 ? '+' : ''}${formatYen(stats.unrealizedPnL)}`}
          subValue={`${stats.unrealizedPnLPercent >= 0 ? '+' : ''}${formatPercent(stats.unrealizedPnLPercent)}`}
          icon={
            stats.unrealizedPnL >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )
          }
          valueColor={pnlColor}
        />
        <StatCard
          label="期待リターン / ボラティリティ"
          value={formatPercent(stats.expectedReturn)}
          subValue={`σ: ${formatPercent(stats.volatility)}`}
          icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          label="シャープレシオ / 最大DD"
          value={stats.sharpeRatio.toFixed(2)}
          subValue={`最大DD: -${formatPercent(stats.maxDrawdown)}`}
          icon={<Shield className="h-5 w-5 text-muted-foreground" />}
        />
      </div>
    </div>
  )
}
