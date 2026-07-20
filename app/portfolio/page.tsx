"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Plus, RefreshCw, Trash2, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import { useDios } from "@/components/dios/store"
import { fmtCurrency } from "@/lib/format"
import { Panel, StatCard } from "@/components/dios/ui-bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchLiveAnalysisReport } from "@/lib/dios/live-analysis"
import { deriveHoldingsFromTransactions } from "@/lib/dios/portfolio-engine"
import type { AnalysisReport } from "@/lib/dios/types"
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
    recommendations,
    settings,
    transactions,
  } = useDios()

  const [liveDecisions, setLiveDecisions] = useState<Record<string, AnalysisReport>>({})
  const [decisionStatus, setDecisionStatus] = useState<"loading" | "live" | "partial">("loading")
  const portfolioRef = useRef(portfolio)
  const settingsRef = useRef(settings)

  useEffect(() => {
    portfolioRef.current = portfolio
  }, [portfolio])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const biggestWinner = useMemo(
    () => [...portfolio.positions].sort((a, b) => b.unrealisedPL - a.unrealisedPL)[0],
    [portfolio.positions],
  )

  const biggestLoser = useMemo(
    () => [...portfolio.positions].sort((a, b) => a.unrealisedPL - b.unrealisedPL)[0],
    [portfolio.positions],
  )


  const realisedPL = useMemo(() => {
    const { realisedByTicker } = deriveHoldingsFromTransactions(transactions)
    return Object.values(realisedByTicker).reduce((sum, value) => sum + value, 0)
  }, [transactions])

  const todayWinner = useMemo(
    () => [...portfolio.positions].sort((a, b) => b.dayChangeValue - a.dayChangeValue)[0],
    [portfolio.positions],
  )

  const todayLoser = useMemo(
    () => [...portfolio.positions].sort((a, b) => a.dayChangeValue - b.dayChangeValue)[0],
    [portfolio.positions],
  )

  const savedDecisions = useMemo(() => {
    const map = new Map<string, (typeof recommendations)[number]>()
    const ordered = [...recommendations].sort((a, b) =>
      b.datetime.localeCompare(a.datetime),
    )

    for (const recommendation of ordered) {
      if (!map.has(recommendation.ticker)) {
        map.set(recommendation.ticker, recommendation)
      }
    }

    return map
  }, [recommendations])

  const tickerKey = useMemo(
    () => portfolio.positions.map((position) => position.ticker).sort().join(","),
    [portfolio.positions],
  )

  const refreshDecisions = useCallback(async () => {
    const currentPortfolio = portfolioRef.current
    const currentSettings = settingsRef.current
    const tickers = currentPortfolio.positions.map((position) => position.ticker)

    if (tickers.length === 0) {
      setLiveDecisions({})
      setDecisionStatus("live")
      return
    }

    setDecisionStatus("loading")

    const results = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const result = await fetchLiveAnalysisReport(
            ticker,
            currentPortfolio,
            currentSettings,
          )
          return [ticker, result.report] as const
        } catch {
          return null
        }
      }),
    )

    const valid = results.filter(
      (item): item is readonly [string, AnalysisReport] => item !== null,
    )

    setLiveDecisions(Object.fromEntries(valid))
    setDecisionStatus(valid.length === tickers.length ? "live" : "partial")
  }, [])

  useEffect(() => {
    void refreshDecisions()

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshDecisions()
      }
    }, 60_000)

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshDecisions()
      }
    }

    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [refreshDecisions, tickerKey])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What your holdings are worth today, what you invested, your realised and unrealised results, and today's movement.
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
          Decisions use the same DIOS engine and live context as the Analyse page.
          {decisionStatus === "loading"
            ? " Updating portfolio decisions…"
            : decisionStatus === "partial"
              ? " Some decisions are using the latest saved fallback."
              : ""}
          {quotesRefreshedAt ? ` Last refreshed ${new Date(quotesRefreshedAt).toLocaleString()}.` : ""}
          {quoteError ? ` ${quoteError}` : ""}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard
          label="Portfolio Value Today"
          value={fmtCurrency(portfolio.investedValue, "USD", 0)}
        />
        <StatCard
          label="Amount Invested"
          value={fmtCurrency(portfolio.costBasis, "USD", 0)}
        />
        <StatCard
          label="Unrealised P/L"
          value={`${fmtCurrency(portfolio.totalPL, "USD", 0)} (${portfolio.totalPLPct >= 0 ? "+" : ""}${portfolio.totalPLPct.toFixed(2)}%)`}
          accent={portfolio.totalPL >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Realised P/L"
          value={fmtCurrency(realisedPL, "USD", 0)}
          accent={realisedPL >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Today's Gain/Loss"
          value={`${fmtCurrency(portfolio.dayChangeValue, "USD", 0)} (${portfolio.dayChangePct >= 0 ? "+" : ""}${portfolio.dayChangePct.toFixed(2)}%)`}
          accent={portfolio.dayChangeValue >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <strong className="text-foreground">How to read this:</strong>{" "}
        Portfolio Value Today is the live value of your open holdings. Amount Invested is the cost basis of those holdings.
        Unrealised P/L is not locked in; Realised P/L comes from recorded completed sales. Today&apos;s Gain/Loss is only the current market session.
      </div>

      <Panel
        title="Holdings"
        description="Bought @ is your weighted-average entry price. Today shows the current session move; Open P/L shows performance since purchase."
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
                <TableHead className="text-right">Today $</TableHead>
                <TableHead className="text-right">Today %</TableHead>
                <TableHead className="text-right">Open P/L</TableHead>
                <TableHead className="text-right">Return</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {portfolio.positions.map((position) => {
                const health = healthLabel(position.unrealisedPLPct)
                const decision =
                  liveDecisions[position.ticker] ??
                  savedDecisions.get(position.ticker)

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
                      position.dayChangeValue >= 0 ? "text-positive" : "text-negative"
                    }`}>
                      {position.dayChangeValue >= 0 ? "+" : ""}
                      {fmtCurrency(position.dayChangeValue, "USD", 0)}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${
                      position.dayChangePct >= 0 ? "text-positive" : "text-negative"
                    }`}>
                      {position.dayChangePct >= 0 ? "+" : ""}
                      {position.dayChangePct.toFixed(2)}%
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
                      <span className={`rounded px-2 py-1 text-xs font-medium ${decisionClass(decision?.recommendation ?? "No Action")}`}>
                        {decision?.recommendation ?? "No Action"}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${scoreClass(decision?.overallScore ?? 0)}`}>
                      {decision ? `${decision.overallScore}/100` : "0/100"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {decision ? `${decision.confidence}%` : "0%"}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <InsightCard
          label="Today's winner"
          value={todayWinner ? `${todayWinner.ticker} ${todayWinner.dayChangeValue >= 0 ? "+" : ""}${fmtCurrency(todayWinner.dayChangeValue, "USD", 0)}` : "—"}
          detail={todayWinner ? `${todayWinner.dayChangePct >= 0 ? "+" : ""}${todayWinner.dayChangePct.toFixed(2)}% today` : "No position data"}
          tone="positive"
        />
        <InsightCard
          label="Today's loser"
          value={todayLoser ? `${todayLoser.ticker} ${fmtCurrency(todayLoser.dayChangeValue, "USD", 0)}` : "—"}
          detail={todayLoser ? `${todayLoser.dayChangePct.toFixed(2)}% today` : "No position data"}
          tone="negative"
        />
        <InsightCard
          label="Largest open winner"
          value={biggestWinner ? `${biggestWinner.ticker} ${fmtCurrency(biggestWinner.unrealisedPL, "USD", 0)}` : "—"}
          detail={biggestWinner ? `${biggestWinner.unrealisedPLPct >= 0 ? "+" : ""}${biggestWinner.unrealisedPLPct.toFixed(2)}% since purchase` : "No position data"}
          tone="positive"
        />
        <InsightCard
          label="Largest open loser"
          value={biggestLoser ? `${biggestLoser.ticker} ${fmtCurrency(biggestLoser.unrealisedPL, "USD", 0)}` : "—"}
          detail={biggestLoser ? `${biggestLoser.unrealisedPLPct.toFixed(2)}% since purchase` : "No position data"}
          tone="negative"
        />
        <InsightCard
          label="Biggest position"
          value={portfolio.largestPosition ? `${portfolio.largestPosition.ticker} ${portfolio.largestPosition.weight.toFixed(1)}%` : "—"}
          detail={portfolio.largestSector ? `${portfolio.largestSector.label} is the largest sector at ${portfolio.largestSector.pct.toFixed(1)}%` : "No exposure data"}
          tone="position"
        />
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Exposure analysis</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Diversification across sectors, countries, instrument types, currencies and themes.
          </p>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <ExposureList title="Sector exposure" items={portfolio.exposure.sector} />
          <ExposureList title="Country exposure" items={portfolio.exposure.country} />
          <ExposureList title="Instrument type" items={portfolio.exposure.type} />
          <ExposureList title="Theme exposure" items={portfolio.exposure.theme} />
        </div>

        <div className="grid gap-3 border-t border-border p-5 md:grid-cols-3">
          <ExposureThreshold
            label="Semiconductor exposure"
            value={portfolio.exposure.semiconductor}
            threshold={25}
          />
          <ExposureThreshold
            label="Energy exposure"
            value={portfolio.exposure.energy}
            threshold={20}
          />
          <ExposureThreshold
            label="Gold / hard assets"
            value={portfolio.exposure.gold}
            threshold={20}
          />
        </div>
      </section>
    </div>
  )
}

function decisionClass(recommendation: string) {
  if (recommendation === "Strong Buy" || recommendation === "Buy") {
    return "bg-positive/10 text-positive"
  }
  if (recommendation === "Buy Watch" || recommendation === "Start Small") {
    return "bg-primary/10 text-primary"
  }
  if (recommendation === "Reduce") {
    return "bg-warning/10 text-warning-foreground"
  }
  if (recommendation === "Sell" || recommendation === "Avoid") {
    return "bg-negative/10 text-negative"
  }
  return "bg-muted text-muted-foreground"
}

function scoreClass(score: number) {
  if (score >= 80) return "text-positive"
  if (score >= 65) return "text-primary"
  if (score >= 45) return "text-warning-foreground"
  return "text-negative"
}

function ExposureList({
  title,
  items,
}: {
  title: string
  items: Array<{ label: string; value: number; pct: number }>
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 space-y-3">
        {items.slice(0, 8).map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>{item.label}</span>
              <span className="font-mono">{item.pct.toFixed(1)}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(item.pct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExposureThreshold({
  label,
  value,
  threshold,
}: {
  label: string
  value: number
  threshold: number
}) {
  const above = value > threshold

  return (
    <div className={`rounded-lg border p-4 ${
      above
        ? "border-negative/30 bg-negative/5"
        : "border-positive/30 bg-positive/5"
    }`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className={above ? "font-mono text-negative" : "font-mono text-positive"}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={above ? "h-full rounded-full bg-negative" : "h-full rounded-full bg-positive"}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {above ? `Above ${threshold}% comfort threshold` : `Within ${threshold}% threshold`}
      </div>
    </div>
  )
}

function InsightCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone?: "positive" | "negative" | "position"
}) {
  const className =
    tone === "positive"
      ? "border-positive/30 bg-positive/5"
      : tone === "negative"
        ? "border-negative/30 bg-negative/5"
        : tone === "position"
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"

  const valueClass =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : tone === "position"
          ? "text-primary"
          : ""

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${valueClass}`}>{value}</div>
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
