import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  StockHolding,
  DataPeriod,
  SimulationParams,
  PriceData,
  PortfolioStatistics,
  SimulationResult,
} from '@/types/portfolio'

interface PortfolioState {
  /** 保有銘柄一覧 */
  holdings: StockHolding[]
  /** データ取得期間 */
  dataPeriod: DataPeriod
  /** シミュレーションパラメータ */
  simulationParams: SimulationParams
  /** 銘柄ごとの株価データキャッシュ（セッション中のみ） */
  priceCache: Record<string, PriceData[]>
  /** ポートフォリオ統計量 */
  portfolioStatistics: PortfolioStatistics | null
  /** シミュレーション結果 */
  simulationResult: SimulationResult | null
  /** 計算中フラグ */
  isSimulating: boolean
  /** シミュレーション進捗 (0-100) */
  simulationProgress: number
  /** データ取得中フラグ */
  isFetchingData: boolean
  /** エラーメッセージ */
  error: string | null

  // Actions
  addHolding: (holding: Omit<StockHolding, 'id'>) => void
  removeHolding: (id: string) => void
  updateHolding: (id: string, updates: Partial<StockHolding>) => void
  setDataPeriod: (period: DataPeriod) => void
  setSimulationParams: (params: Partial<SimulationParams>) => void
  setPriceCache: (code: string, data: PriceData[]) => void
  setPortfolioStatistics: (stats: PortfolioStatistics | null) => void
  setSimulationResult: (result: SimulationResult | null) => void
  setIsSimulating: (value: boolean) => void
  setSimulationProgress: (value: number) => void
  setIsFetchingData: (value: boolean) => void
  setError: (error: string | null) => void
  clearAll: () => void
}

const MAX_HOLDINGS = 20

let nextId = 1
function generateId(): string {
  return `holding-${Date.now()}-${nextId++}`
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      holdings: [],
      dataPeriod: 5,
      simulationParams: {
        years: 10,
        numSimulations: 10000,
        annualAddition: 0,
        riskFreeRate: 0.001,
      },
      priceCache: {},
      portfolioStatistics: null,
      simulationResult: null,
      isSimulating: false,
      simulationProgress: 0,
      isFetchingData: false,
      error: null,

      addHolding: (holding) => {
        const { holdings } = get()
        if (holdings.length >= MAX_HOLDINGS) {
          set({ error: `最大${MAX_HOLDINGS}銘柄までです` })
          return
        }
        if (holdings.some((h) => h.code === holding.code)) {
          set({ error: `銘柄コード ${holding.code} は既に登録されています` })
          return
        }
        set({
          holdings: [...holdings, { ...holding, id: generateId() }],
          error: null,
        })
      },

      removeHolding: (id) => {
        set((state) => ({
          holdings: state.holdings.filter((h) => h.id !== id),
          error: null,
        }))
      },

      updateHolding: (id, updates) => {
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.id === id ? { ...h, ...updates } : h,
          ),
        }))
      },

      setDataPeriod: (period) => set({ dataPeriod: period }),
      setSimulationParams: (params) =>
        set((state) => ({
          simulationParams: { ...state.simulationParams, ...params },
        })),
      setPriceCache: (code, data) =>
        set((state) => ({
          priceCache: { ...state.priceCache, [code]: data },
        })),
      setPortfolioStatistics: (stats) =>
        set({ portfolioStatistics: stats }),
      setSimulationResult: (result) => set({ simulationResult: result }),
      setIsSimulating: (value) => set({ isSimulating: value }),
      setSimulationProgress: (value) => set({ simulationProgress: value }),
      setIsFetchingData: (value) => set({ isFetchingData: value }),
      setError: (error) => set({ error }),
      clearAll: () =>
        set({
          holdings: [],
          priceCache: {},
          portfolioStatistics: null,
          simulationResult: null,
          error: null,
        }),
    }),
    {
      name: 'portfolio-vision-storage',
      // priceCache, simulationResult などの一時データは永続化しない
      partialize: (state) => ({
        holdings: state.holdings,
        dataPeriod: state.dataPeriod,
        simulationParams: state.simulationParams,
      }),
    },
  ),
)
