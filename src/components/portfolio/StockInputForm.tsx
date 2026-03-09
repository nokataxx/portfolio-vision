import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useStockData } from '@/hooks/useStockData'
import { Loader2, Plus } from 'lucide-react'

export function StockInputForm() {
  const [code, setCode] = useState('')
  const [shares, setShares] = useState('')
  const [acquisitionPrice, setAcquisitionPrice] = useState('')
  const [stockName, setStockName] = useState('')
  const [isLooking, setIsLooking] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const addHolding = usePortfolioStore((s) => s.addHolding)
  const error = usePortfolioStore((s) => s.error)
  const { fetchStockInfo, fetchStockPrices } = useStockData()

  const handleCodeBlur = async () => {
    const trimmed = code.trim()
    if (!/^\d{4}$/.test(trimmed)) {
      setStockName('')
      setLookupError(trimmed ? '4桁の証券コードを入力してください' : '')
      return
    }

    setIsLooking(true)
    setLookupError('')
    try {
      const info = await fetchStockInfo(trimmed)
      setStockName(info.name)
    } catch {
      setLookupError('銘柄情報を取得できませんでした')
      setStockName('')
    } finally {
      setIsLooking(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmedCode = code.trim()

    if (!/^\d{4}$/.test(trimmedCode)) {
      setLookupError('4桁の証券コードを入力してください')
      return
    }

    const sharesNum = parseInt(shares, 10)
    const priceNum = parseFloat(acquisitionPrice)
    if (!sharesNum || sharesNum <= 0) return
    if (!priceNum || priceNum <= 0) return

    let name = stockName
    if (!name) {
      setIsLooking(true)
      try {
        const info = await fetchStockInfo(trimmedCode)
        name = info.name
      } catch {
        setLookupError('銘柄情報を取得できませんでした')
        setIsLooking(false)
        return
      }
      setIsLooking(false)
    }

    addHolding({
      code: trimmedCode,
      name,
      shares: sharesNum,
      acquisitionPrice: priceNum,
    })

    // 株価データをバックグラウンドで取得
    fetchStockPrices(trimmedCode).catch(() => {})

    // フォームリセット
    setCode('')
    setShares('')
    setAcquisitionPrice('')
    setStockName('')
    setLookupError('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="stock-code">証券コード</Label>
          <Input
            id="stock-code"
            placeholder="例: 7203"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={handleCodeBlur}
            maxLength={4}
            pattern="\d{4}"
          />
        </div>
        <div className="space-y-1.5">
          <Label>銘柄名</Label>
          <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
            {isLooking ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <span className={stockName ? '' : 'text-muted-foreground'}>
                {stockName || '自動取得'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="shares">保有株数</Label>
          <Input
            id="shares"
            type="number"
            placeholder="例: 100"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            min={1}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="acquisition-price">取得単価（円）</Label>
          <Input
            id="acquisition-price"
            type="number"
            placeholder="例: 2800"
            value={acquisitionPrice}
            onChange={(e) => setAcquisitionPrice(e.target.value)}
            min={1}
            step="0.01"
          />
        </div>
      </div>

      {(lookupError || error) && (
        <p className="text-sm text-destructive">{lookupError || error}</p>
      )}

      <Button type="submit" className="w-full" disabled={isLooking}>
        <Plus className="mr-1.5 h-4 w-4" />
        銘柄を追加
      </Button>
    </form>
  )
}
