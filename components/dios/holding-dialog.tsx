"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Loader2, Plus, Search } from "lucide-react"
import { useDios } from "@/components/dios/store"
import { getInstrument } from "@/lib/dios/universe"
import type { Instrument, InstrumentType } from "@/lib/dios/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type SearchResult = {
  symbol: string
  name: string
  exchange: string
  type: InstrumentType
  currency?: string
}

type QuoteResponse = {
  quotes?: Array<{
    symbol: string
    name?: string
    price: number
    previousClose: number
  }>
  error?: string
}

function toInstrument(result: SearchResult, price: number, previousClose: number): Instrument {
  const local = getInstrument(result.symbol)
  if (local) return local

  return {
    ticker: result.symbol,
    name: result.name,
    type: result.type,
    sector: "Unclassified",
    industry: result.type === "etf" ? "Exchange Traded Fund" : "Unclassified",
    country: "United States",
    currency: result.currency || "USD",
    tags: [],
    riskBand: "medium",
    price,
    prevClose: previousClose,
    qualityHint: 50,
    valuationHint: 50,
    growthHint: 50,
    momentumHint: 50,
    themes: [],
  }
}

export function AddHoldingDialog() {
  const { upsertHolding } = useDios()
  const [open, setOpen] = useState(false)
  const [ticker, setTicker] = useState("")
  const [quantity, setQuantity] = useState("")
  const [avgCost, setAvgCost] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)

  useEffect(() => {
    const q = ticker.trim()
    if (!open || selected?.symbol === q.toUpperCase() || q.length < 1) {
      setResults([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = await response.json() as { results?: SearchResult[]; provider?: string }
        setResults(Array.isArray(payload.results) ? payload.results : [])
        setProvider(payload.provider ?? null)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [ticker, selected, open])

  const canSave = useMemo(() => {
    const q = Number(quantity)
    const c = Number(avgCost)
    return Boolean(selected && q > 0 && c > 0 && !saving)
  }, [selected, quantity, avgCost, saving])

  function choose(result: SearchResult) {
    setSelected(result)
    setTicker(result.symbol)
    setResults([])
  }

  function reset() {
    setTicker("")
    setQuantity("")
    setAvgCost("")
    setSelected(null)
    setResults([])
    setProvider(null)
  }

  async function submit() {
    if (!selected) {
      toast.error("Select a verified ticker from the search results")
      return
    }

    const q = Number(quantity)
    const c = Number(avgCost)
    if (!q || q <= 0 || !c || c <= 0) {
      toast.error("Enter a valid quantity and average cost")
      return
    }

    setSaving(true)
    try {
      // Final quote check prevents a stale or invalid search result from being saved.
      const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(selected.symbol)}`, { cache: "no-store" })
      const payload = await response.json() as QuoteResponse
      const quote = payload.quotes?.find((item) => item.symbol === selected.symbol)
      if (!response.ok || !quote || !Number.isFinite(quote.price) || quote.price <= 0) {
        throw new Error(payload.error || `${selected.symbol} could not be verified`)
      }

      upsertHolding({
        ticker: selected.symbol,
        quantity: q,
        avgCost: c,
        instrument: toInstrument(
          { ...selected, name: quote.name || selected.name },
          quote.price,
          quote.previousClose || quote.price,
        ),
      })
      toast.success(`Added ${q} ${selected.symbol} at ${c}`)
      reset()
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to verify this ticker")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset() }}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4" />
            Add holding
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add or update a holding</DialogTitle>
          <DialogDescription>
            Search and select a verified security. Any valid stock or ETF can be added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hd-ticker">Ticker or company</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="hd-ticker"
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value.toUpperCase())
                  setSelected(null)
                }}
                placeholder="e.g. KO or Coca-Cola"
                className="pl-9 font-mono"
                autoComplete="off"
              />
              {searching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {selected ? (
              <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <div className="font-medium">{selected.symbol} — {selected.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[selected.exchange, selected.currency, selected.type.toUpperCase()].filter(Boolean).join(" · ")} · Verified
                  </div>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-56 overflow-y-auto rounded-md border bg-background shadow-sm">
                {results.map((result) => (
                  <button
                    key={`${result.symbol}-${result.exchange}`}
                    type="button"
                    onClick={() => choose(result)}
                    className="block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted"
                  >
                    <div className="font-medium"><span className="font-mono">{result.symbol}</span> — {result.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[result.exchange, result.currency, result.type.toUpperCase()].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
            ) : ticker.trim() && !searching ? (
              <p className="text-xs text-muted-foreground">No verified matches yet. Check the ticker or company name.</p>
            ) : null}

            {provider && !selected && results.length > 0 && (
              <p className="text-[11px] text-muted-foreground">Search source: {provider}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hd-qty">Quantity</Label>
              <Input id="hd-qty" type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hd-cost">Avg cost ({selected?.currency || "USD"})</Label>
              <Input id="hd-cost" type="number" min="0" step="any" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!canSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save holding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
