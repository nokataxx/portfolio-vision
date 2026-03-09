import { usePortfolioStore } from '@/store/portfolioStore'
import { TrendingUp, TrendingDown, BarChart3, Shield, Wallet, Activity, ChartNoAxesCombined, Percent } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

function formatYen(value: number): string {
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}万円`
  }
  return `¥${value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

interface StatItemProps {
  label: string
  value: string
  subValue?: string
  icon: React.ReactNode
  valueColor?: string
}

function StatItem({ label, value, subValue, icon, valueColor }: StatItemProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-bold ${valueColor ?? ''}`}>{value}</span>
          {subValue && (
            <span className="text-xs text-muted-foreground">{subValue}</span>
          )}
        </div>
      </div>
    </div>
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
    <div className="mt-4">
      <Separator className="mb-4" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatItem
          label="取得価格合計"
          value={formatYen(stats.totalAcquisitionCost)}
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
        />
        <StatItem
          label="現在の評価額"
          value={formatYen(stats.totalMarketValue)}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />
        <StatItem
          label="含み損益"
          value={`${stats.unrealizedPnL >= 0 ? '+' : ''}${formatYen(stats.unrealizedPnL)}`}
          icon={
            stats.unrealizedPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )
          }
          valueColor={pnlColor}
        />
        <StatItem
          label="損益率"
          value={`${stats.unrealizedPnLPercent >= 0 ? '+' : ''}${formatPercent(stats.unrealizedPnLPercent)}`}
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
          valueColor={pnlColor}
        />
        <StatItem
          label="期待リターン"
          value={formatPercent(stats.expectedReturn)}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <StatItem
          label="ボラティリティ"
          value={formatPercent(stats.volatility)}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <StatItem
          label="シャープレシオ"
          value={stats.sharpeRatio.toFixed(2)}
          icon={<ChartNoAxesCombined className="h-4 w-4 text-muted-foreground" />}
        />
        <StatItem
          label="最大ドローダウン"
          value={`-${formatPercent(stats.maxDrawdown)}`}
          icon={<Shield className="h-4 w-4 text-muted-foreground" />}
        />
      </div>
    </div>
  )
}
