import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StockInputForm } from '@/components/portfolio/StockInputForm'
import { HoldingsTable } from '@/components/portfolio/HoldingsTable'
import { SimulationSettings } from '@/components/portfolio/SimulationSettings'
import { PortfolioSummary } from '@/components/results/PortfolioSummary'
import { SimulationSummary } from '@/components/results/SimulationSummary'
import { ValueDistributionChart } from '@/components/charts/ValueDistributionChart'
import { ValueProjectionChart } from '@/components/charts/ValueProjectionChart'
import { PrincipalLossChart } from '@/components/charts/PrincipalLossChart'
import { RiskContributionChart } from '@/components/charts/RiskContributionChart'
import { CorrelationMatrixChart } from '@/components/charts/CorrelationMatrixChart'
import { MarginalRiskChart } from '@/components/charts/MarginalRiskChart'
import { LeaveOneOutTable } from '@/components/results/LeaveOneOutTable'
import { HistoricalPriceChart } from '@/components/charts/HistoricalPriceChart'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useStockData } from '@/hooks/useStockData'
import { RefreshCw, Loader2 } from 'lucide-react'

function App() {
  const holdings = usePortfolioStore((s) => s.holdings)
  const isFetchingData = usePortfolioStore((s) => s.isFetchingData)
  const error = usePortfolioStore((s) => s.error)
  const simulationResult = usePortfolioStore((s) => s.simulationResult)
  const { fetchAllAndCalcStats } = useStockData()

  // 銘柄が変更されたら統計量を再計算
  const holdingsKey = holdings.map((h) => `${h.code}:${h.shares}:${h.acquisitionPrice}`).join(',')
  useEffect(() => {
    if (holdings.length > 0) {
      fetchAllAndCalcStats()
    }
  }, [holdingsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Portfolio Vision
          </h1>
          <p className="text-sm text-muted-foreground">
            株式ポートフォリオ モンテカルロシミュレーター
          </p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* 左パネル：銘柄入力・設定 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">銘柄登録</CardTitle>
              </CardHeader>
              <CardContent>
                <StockInputForm />
              </CardContent>
            </Card>

            {holdings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">シミュレーション設定</CardTitle>
                </CardHeader>
                <CardContent>
                  <SimulationSettings />
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右パネル：結果表示 */}
          <div className="space-y-6">
            {error && (
              <Card className="border-destructive">
                <CardContent className="p-4 text-sm text-destructive">
                  {error}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">保有銘柄一覧</CardTitle>
                {holdings.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAllAndCalcStats(true)}
                    disabled={isFetchingData}
                  >
                    {isFetchingData ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    データ更新
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <HoldingsTable />
                <PortfolioSummary />
              </CardContent>
            </Card>

            <HistoricalPriceChart />

            {/* ポートフォリオ分析（過去データベース） */}
            <CorrelationMatrixChart />
            <RiskContributionChart />
            <MarginalRiskChart />
            <LeaveOneOutTable />

            {/* シミュレーション結果（将来予測） */}
            {simulationResult && (
              <>
                <Separator />
                <SimulationSummary />
                <div className="grid gap-6 xl:grid-cols-2">
                  <ValueDistributionChart />
                  <ValueProjectionChart />
                </div>
                <PrincipalLossChart />
              </>
            )}

            {holdings.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                <p className="text-lg font-medium text-muted-foreground">
                  銘柄を登録してください
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  左のパネルから証券コードを入力して銘柄を追加すると、
                  <br />
                  ポートフォリオの分析結果がここに表示されます。
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <Separator className="mb-4" />
          <p className="text-xs text-muted-foreground">
            ※ 本ツールの計算結果はあくまで参考値であり、将来の株価・運用成果を保証するものではありません。投資判断はご自身の責任で行ってください。
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
