"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus, RefreshCw, Trash2, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import { useDios } from "@/components/dios/store"
import { fmtCurrency } from "@/lib/format"
import { Panel, StatCard } from "@/components/dios/ui-bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatQty(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(value)
}

function healthLabel(pct: number) {
  if (pct >= 10) return { label: "Strong performer", className: "text-positive bg-positive/10" }
  if (pct >= 0) return { label: "Healthy", className: "text-positive bg-positive/10" }
  if (pct >= -5) return { label: "Watch", className: "text-warning-foreground bg-warning/10" }
  if (pct >= -15) return { label: "Under pressure", className: "text-warning-foreground bg-warning/10" }
  return { label: "Deep review", className: "text-negative bg-negative/10" }
}

export default function PortfolioPage() {
  const {
    portfolio,
    quoteStatus,
    quoteError,
    quotesRefreshedAt,
    refreshQuotes,
    removeHolding,
    upsertHolding,
  } = useDios()

  const biggestWinner = useMemo(
    () => [...portfolio.positions].sort((a, b) => b.unrealisedPL - a.unrealisedPL)[0],
    [portfolio.positions],
  )

  const biggestLoser = useMemo(
    () => [...portfolio.positions].sort((a, b) => a.unrealisedPL - b.unrealisedPL)[0],
    [portfolio.positions],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What your holdings are worth now, what you paid, and the exact open profit or loss.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refreshQuotes()}>
            <RefreshCw className="h-4 w-4" />
            Refresh prices
          </Button>
          <AddHoldingDialog onAdd={upsertHolding} />
        </div>
      </div>

      <div className={`rounded-lg border p-4 text-sm ${
        quoteStatus === "live"
          ? "border-positive/40 bg-positive/10"
          : quoteStatus === "error"
            ? "border-negative/40 bg-negative/10"
            : "border-warning/40 bg-warning/10"
      }`}>
        <div className="font-medium">
          {quoteStatus === "live" ? "Live market prices connected" : quoteStatus === "error" ? "Price refresh issue" : "Refreshing market prices"}
        </div>
        <div className="mt-1 text-muted-foreground">
          Average buy prices come from your DIOS holdings and imported Stake transactions.
          {quotesRefreshedAt ? ` Last refreshed ${new Date(quotesRefreshedAt).toLocaleString()}.` : ""}
          {quoteError ? ` ${quoteError}` : ""}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Current Portfolio Value"
          value={fmtCurrency(portfolio.investedValue, "USD", 0)}
        />
        <StatCard
          label="Total Cost Basis"
          value={fmtCurrency(portfolio.costBasis, "USD", 0)}
        />
        <StatCard
          label="Open P/L"
          value={`${fmtCurrency(portfolio.totalPL, "USD", 0)} (${portfolio.totalPLPct >= 0 ? "+" : ""}${portfolio.totalPLPct.toFixed(2)}%)`}
          accent={portfolio.totalPL >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Today's Change"
          value={`${fmtCurrency(portfolio.dayChangeValue, "USD", 0)} (${portfolio.dayChangePct >= 0 ? "+" : ""}${portfolio.dayChangePct.toFixed(2)}%)`}
          accent={portfolio.dayChangeValue >= 0 ? "positive" : "negative"}
        />
      </div>

      <Panel
        title="Holdings"
        description="Bought @ is your weighted-average entry price. Current is the latest market price."
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Bought @</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">Open P/L</TableHead>
                <TableHead className="text-right">Return</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {portfolio.positions.map((position) => {
                const health = healthLabel(position.unrealisedPLPct)

                return (
                  <TableRow key={position.ticker}>
                    <TableCell>
                      <Link
                        href={`/portfolio/${encodeURIComponent(position.ticker)}`}
                        className="inline-flex items-center gap-1 font-mono font-semibold hover:underline"
                      >
                        {position.ticker}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {position.instrument.sector}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(position.quantity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtCurrency(position.avgCost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div>{fmtCurrency(position.price)}</div>
                      <div className="text-[10px] uppercase text-positive">
                        {position.priceSource}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmtCurrency(position.marketValue, "USD", 0)}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${
                      position.unrealisedPL >= 0 ? "text-positive" : "text-negative"
                    }`}>
                      {fmtCurrency(position.unrealisedPL, "USD", 0)}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${
                      position.unrealisedPLPct >= 0 ? "text-positive" : "text-negative"
                    }`}>
                      {position.unrealisedPLPct >= 0 ? "+" : ""}
                      {position.unrealisedPLPct.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {position.weight.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <span className={`rounded px-2 py-1 text-xs ${health.className}`}>
                        {health.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          removeHolding(position.ticker)
                          toast.success(`${position.ticker} removed`)
                        }}
                        aria-label={`Remove ${position.ticker}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightCard
          label="Largest winner"
          value={biggestWinner ? `${biggestWinner.ticker} ${fmtCurrency(biggestWinner.unrealisedPL, "USD", 0)}` : "—"}
          detail={biggestWinner ? `${biggestWinner.unrealisedPLPct >= 0 ? "+" : ""}${biggestWinner.unrealisedPLPct.toFixed(2)}% from average buy price` : "No position data"}
        />
        <InsightCard
          label="Largest loser"
          value={biggestLoser ? `${biggestLoser.ticker} ${fmtCurrency(biggestLoser.unrealisedPL, "USD", 0)}` : "—"}
          detail={biggestLoser ? `${biggestLoser.unrealisedPLPct.toFixed(2)}% from average buy price` : "No position data"}
        />
        <InsightCard
          label="Biggest position"
          value={portfolio.largestPosition ? `${portfolio.largestPosition.ticker} ${portfolio.largestPosition.weight.toFixed(1)}%` : "—"}
          detail={portfolio.largestSector ? `${portfolio.largestSector.label} is the largest sector at ${portfolio.largestSector.pct.toFixed(1)}%` : "No exposure data"}
        />
      </div>
    </div>
  )
}

function InsightCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </div>
  )
}

function AddHoldingDialog({
  onAdd,
}: {
  onAdd: (holding: { ticker: string; quantity: number; avgCost: number }) => void
}) {
  const [open, setOpen] = useState(false)
  const [ticker, setTicker] = useState("")
  const [quantity, setQuantity] = useState("")
  const [avgCost, setAvgCost] = useState("")

  function submit() {
    const symbol = ticker.trim().toUpperCase()
    const qty = Number(quantity)
    const cost = Number(avgCost)

    if (!symbol || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost <= 0) {
      toast.error("Enter a ticker, quantity and average buy price")
      return
    }

    onAdd({ ticker: symbol, quantity: qty, avgCost: cost })
    toast.success(`${symbol} holding saved`)
    setOpen(false)
    setTicker("")
    setQuantity("")
    setAvgCost("")
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
          <DialogTitle>Add or update holding</DialogTitle>
          <DialogDescription>
            Enter the quantity and weighted-average price paid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="holding-ticker">Ticker</Label>
            <Input
              id="holding-ticker"
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              placeholder="GOOG"
              className="font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="holding-qty">Quantity</Label>
              <Input
                id="holding-qty"
                type="number"
                step="any"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holding-cost">Average buy price</Label>
              <Input
                id="holding-cost"
                type="number"
                step="any"
                value={avgCost}
                onChange={(event) => setAvgCost(event.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Save holding</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
