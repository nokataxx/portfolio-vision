import { useState, useRef, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePortfolioStore } from '@/store/portfolioStore'
import { Trash2 } from 'lucide-react'

function fractionDigits(value: number): number {
  const s = String(value)
  const dotIndex = s.indexOf('.')
  return dotIndex === -1 ? 0 : s.length - dotIndex - 1
}

function formatCurrency(value: number, decimals?: number): string {
  const d = decimals ?? fractionDigits(value)
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}

function EditableCell({
  value,
  onSave,
  format,
  className,
}: {
  value: number
  onSave: (value: number) => void
  format: (v: number) => string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const parsed = Number(draft)
    if (!isNaN(parsed) && parsed > 0) {
      onSave(parsed)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="h-7 w-24 text-right text-sm"
      />
    )
  }

  return (
    <span
      className={`cursor-pointer rounded px-1 hover:bg-muted ${className ?? ''}`}
      onClick={() => {
        setDraft(String(value))
        setEditing(true)
      }}
    >
      {format(value)}
    </span>
  )
}

export function HoldingsTable() {
  const holdings = usePortfolioStore((s) => s.holdings)
  const portfolioStatistics = usePortfolioStore((s) => s.portfolioStatistics)
  const removeHolding = usePortfolioStore((s) => s.removeHolding)
  const updateHolding = usePortfolioStore((s) => s.updateHolding)

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
                <TableCell className="text-right">
                  <EditableCell
                    value={h.shares}
                    onSave={(v) => updateHolding(h.id, { shares: v })}
                    format={(v) => v.toLocaleString()}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <EditableCell
                    value={h.acquisitionPrice}
                    onSave={(v) => updateHolding(h.id, { acquisitionPrice: v })}
                    format={(v) => `¥${formatCurrency(v)}`}
                  />
                </TableCell>
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
