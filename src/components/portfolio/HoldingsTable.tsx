import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { usePortfolioStore } from '@/store/portfolioStore'
import { Trash2 } from 'lucide-react'

function formatCurrency(value: number): string {
  return value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })
}

export function HoldingsTable() {
  const holdings = usePortfolioStore((s) => s.holdings)
  const portfolioStatistics = usePortfolioStore((s) => s.portfolioStatistics)
  const removeHolding = usePortfolioStore((s) => s.removeHolding)

  if (holdings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        銘柄が登録されていません。上のフォームから追加してください。
      </p>
    )
  }

  const getStockStats = (code: string) =>
    portfolioStatistics?.stockStatistics.find((s) => s.code === code)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[72px]">コード</TableHead>
            <TableHead>銘柄名</TableHead>
            <TableHead className="text-right">株数</TableHead>
            <TableHead className="text-right">取得単価</TableHead>
            <TableHead className="text-right">現在値</TableHead>
            <TableHead className="text-right">評価額</TableHead>
            <TableHead className="text-right">損益率</TableHead>
            <TableHead className="w-[48px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => {
            const stats = getStockStats(h.code)
            const currentPrice = stats?.currentPrice ?? 0
            const marketValue = currentPrice * h.shares
            const cost = h.acquisitionPrice * h.shares
            const pnlRate = cost > 0 ? (marketValue - cost) / cost : 0

            return (
              <TableRow key={h.id}>
                <TableCell className="font-mono">{h.code}</TableCell>
                <TableCell className="max-w-[120px] truncate">{h.name}</TableCell>
                <TableCell className="text-right">{h.shares.toLocaleString()}</TableCell>
                <TableCell className="text-right">¥{formatCurrency(h.acquisitionPrice)}</TableCell>
                <TableCell className="text-right">
                  {currentPrice > 0 ? `¥${formatCurrency(currentPrice)}` : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {currentPrice > 0 ? `¥${formatCurrency(marketValue)}` : '—'}
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    pnlRate > 0
                      ? 'text-green-600'
                      : pnlRate < 0
                        ? 'text-red-600'
                        : ''
                  }`}
                >
                  {currentPrice > 0
                    ? `${pnlRate >= 0 ? '+' : ''}${(pnlRate * 100).toFixed(2)}%`
                    : '—'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeHolding(h.id)}
                    aria-label={`${h.name}を削除`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
