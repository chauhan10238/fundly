"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { useDios } from "@/components/dios/store"
import { getInstrument, UNIVERSE_LIST } from "@/lib/dios/universe"
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

export function AddHoldingDialog() {
  const { upsertHolding } = useDios()
  const [open, setOpen] = useState(false)
  const [ticker, setTicker] = useState("")
  const [quantity, setQuantity] = useState("")
  const [avgCost, setAvgCost] = useState("")

  function submit() {
    const t = ticker.trim().toUpperCase()
    const inst = getInstrument(t)
    if (!inst) {
      toast.error(`${t || "Ticker"} is not in the demo universe`)
      return
    }
    const q = Number(quantity)
    const c = Number(avgCost)
    if (!q || q <= 0 || !c || c <= 0) {
      toast.error("Enter a valid quantity and average cost")
      return
    }
    upsertHolding({ ticker: t, quantity: q, avgCost: c })
    toast.success(`Added ${q} ${t} at ${c}`)
    setTicker("")
    setQuantity("")
    setAvgCost("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Positions update your portfolio analytics instantly. Use a ticker from the tracked universe.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hd-ticker">Ticker</Label>
            <Input
              id="hd-ticker"
              list="hd-universe"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="e.g. NVDA"
              className="font-mono"
            />
            <datalist id="hd-universe">
              {UNIVERSE_LIST.map((i) => (
                <option key={i.ticker} value={i.ticker}>
                  {i.name}
                </option>
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hd-qty">Quantity</Label>
              <Input
                id="hd-qty"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hd-cost">Avg cost (USD)</Label>
              <Input
                id="hd-cost"
                type="number"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save holding</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
