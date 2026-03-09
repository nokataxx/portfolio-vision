import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStore } from '@/store/portfolioStore'
import { calcPortfolioStatistics } from '@/utils/statistics'

interface LooRow {
  code: string
  name: string
  expectedReturn: number
  volatility: number
  sharpeRatio: number
}

export function LeaveOneOutTable() {
  const holdings = usePortfolioStore((s) => s.holdings)
  const priceCache = usePortfolioStore((s) => s.priceCache)
  const portfolioStatistics = usePortfolioStore((s) => s.portfolioStatistics)
  const simulationParams = usePortfolioStore((s) => s.simulationParams)

  const { baseline, rows } = useMemo(() => {
    if (!portfolioStatistics || holdings.length < 3) {
      return { baseline: null, rows: [] }
    }

    // 全銘柄の株価データが揃っているか確認
    const allDataAvailable = holdings.every((h) => priceCache[h.code]?.length > 0)
    if (!allDataAvailable) return { baseline: null, rows: [] }

    const baseline: LooRow = {
      code: '全銘柄',
      name: '（現在のポートフォリオ）',
      expectedReturn: portfolioStatistics.expectedReturn,
      volatility: portfolioStatistics.volatility,
      sharpeRatio: portfolioStatistics.sharpeRatio,
    }

    const rows: LooRow[] = holdings.map((excludedHolding) => {
      const remainingHoldings = holdings.filter((h) => h.id !== excludedHolding.id)
      const stats = calcPortfolioStatistics(
        remainingHoldings,
        priceCache,
        simulationParams.riskFreeRate,
      )
      return {
        code: excludedHolding.code,
        name: excludedHolding.name,
        expectedReturn: stats.expectedReturn,
        volatility: stats.volatility,
        sharpeRatio: stats.sharpeRatio,
      }
    })

    return { baseline, rows }
  }, [holdings, priceCache, portfolioStatistics, simulationParams.riskFreeRate])

  if (!baseline || rows.length === 0) return null

  const formatPct = (v: number) => `${(v * 100).toFixed(2)}%`
  const formatSR = (v: number) => v.toFixed(3)

  const diffColor = (current: number, base: number, higherIsBetter: boolean) => {
    const diff = current - base
    if (Math.abs(diff) < 0.0001) return ''
    const improved = higherIsBetter ? diff > 0 : diff < 0
    return improved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  }

  const diffText = (current: number, base: number, formatter: (v: number) => string) => {
    const diff = current - base
    if (Math.abs(diff) < 0.0001) return ''
    const sign = diff > 0 ? '+' : ''
    return `(${sign}${formatter(diff)})`
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">除外シミュレーション（Leave-One-Out）</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">除外銘柄</th>
                <th className="pb-2 pr-4 text-right font-medium">期待リターン</th>
                <th className="pb-2 pr-4 text-right font-medium">ボラティリティ</th>
                <th className="pb-2 text-right font-medium">シャープレシオ</th>
              </tr>
            </thead>
            <tbody>
              {/* 基準行 */}
              <tr className="border-b bg-muted/50 font-medium">
                <td className="py-2 pr-4">
                  <span className="text-muted-foreground">{baseline.code}</span>
                </td>
                <td className="py-2 pr-4 text-right">{formatPct(baseline.expectedReturn)}</td>
                <td className="py-2 pr-4 text-right">{formatPct(baseline.volatility)}</td>
                <td className="py-2 text-right">{formatSR(baseline.sharpeRatio)}</td>
              </tr>
              {/* 各銘柄除外行 */}
              {rows.map((row) => (
                <tr key={row.code} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <span className="font-medium">{row.code}</span>
                    <span className="ml-1 text-muted-foreground">{row.name}</span>
                  </td>
                  <td className={`py-2 pr-4 text-right ${diffColor(row.expectedReturn, baseline.expectedReturn, true)}`}>
                    {formatPct(row.expectedReturn)}{' '}
                    <span className="text-[10px]">
                      {diffText(row.expectedReturn, baseline.expectedReturn, formatPct)}
                    </span>
                  </td>
                  <td className={`py-2 pr-4 text-right ${diffColor(row.volatility, baseline.volatility, false)}`}>
                    {formatPct(row.volatility)}{' '}
                    <span className="text-[10px]">
                      {diffText(row.volatility, baseline.volatility, formatPct)}
                    </span>
                  </td>
                  <td className={`py-2 text-right ${diffColor(row.sharpeRatio, baseline.sharpeRatio, true)}`}>
                    {formatSR(row.sharpeRatio)}{' '}
                    <span className="text-[10px]">
                      {diffText(row.sharpeRatio, baseline.sharpeRatio, formatSR)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          ※ 各行は該当銘柄を除外した場合のポートフォリオ指標を表示。
          シャープレシオが改善（<span className="text-green-600 dark:text-green-400">緑</span>）する銘柄は除外候補、
          悪化（<span className="text-red-600 dark:text-red-400">赤</span>）する銘柄は保持すべき銘柄を示唆します。
        </p>
      </CardContent>
    </Card>
  )
}
