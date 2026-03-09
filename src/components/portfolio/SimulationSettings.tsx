import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useSimulation } from '@/hooks/useSimulation'
import { Play, Square, Loader2 } from 'lucide-react'

export function SimulationSettings() {
  const simulationParams = usePortfolioStore((s) => s.simulationParams)
  const setSimulationParams = usePortfolioStore((s) => s.setSimulationParams)
  const isSimulating = usePortfolioStore((s) => s.isSimulating)
  const simulationProgress = usePortfolioStore((s) => s.simulationProgress)
  const holdings = usePortfolioStore((s) => s.holdings)
  const portfolioStatistics = usePortfolioStore((s) => s.portfolioStatistics)
  const isFetchingData = usePortfolioStore((s) => s.isFetchingData)
  const { runSimulation, cancelSimulation } = useSimulation()

  const canRun = holdings.length > 0 && portfolioStatistics !== null && !isFetchingData

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sim-years">期間（年）</Label>
          <Input
            id="sim-years"
            type="number"
            value={simulationParams.years}
            onChange={(e) => setSimulationParams({ years: parseInt(e.target.value) || 10 })}
            min={1}
            max={30}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sim-addition">追加投資額（万円/年）</Label>
        <Input
          id="sim-addition"
          type="number"
          value={simulationParams.annualAddition}
          onChange={(e) =>
            setSimulationParams({ annualAddition: parseFloat(e.target.value) || 0 })
          }
            min={0}
          />
        </div>
      </div>

      {holdings.length >= 2 && (
        <div className="flex items-center justify-between">
          <Label htmlFor="use-correlation" className="text-sm">
            銘柄間の相関を考慮
          </Label>
          <Switch
            id="use-correlation"
            checked={simulationParams.useCorrelation}
            onCheckedChange={(checked) => setSimulationParams({ useCorrelation: checked })}
          />
        </div>
      )}

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        {isSimulating && (
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${simulationProgress}%` }}
          />
        )}
      </div>
      {isSimulating ? (
        <Button variant="outline" className="w-full" onClick={cancelSimulation}>
          <Square className="mr-1.5 h-4 w-4" />
          中止
        </Button>
      ) : (
        <Button className="w-full" onClick={runSimulation} disabled={!canRun}>
          {!canRun ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-1.5 h-4 w-4" />
          )}
          シミュレーション実行
        </Button>
      )}
    </div>
  )
}
