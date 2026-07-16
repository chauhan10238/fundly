"use client"

import Link from "next/link"
import { useState } from "react"
import { RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useDios } from "@/components/dios/store"
import { fmtCompact, fmtCurrency, fmtPct } from "@/lib/format"
import { DeltaText, Panel, StatCard } from "@/components/dios/ui-bits"
import { AllocationDonut } from "@/components/dios/allocation-donut"
import { AddHoldingDialog } from "@/components/dios/holding-dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Allocation } from "@/lib/dios/portfolio-engine"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PortfolioPage() {
  const { portfolio, removeHolding, cash, resetPortfolio } = useDios()
  const { positions, totalValue, totalPL, totalPLPct, exposure } = portfolio
  const [confirm, setConfirm] = useState<string | null>(null)

  function handleRemove(ticker: string) {
    if (confirm === ticker) {
      removeHolding(ticker)
      toast.success(`Removed ${ticker}`)
      setConfirm(null)
    } else {
      setConfirm(ticker)
      setTimeout(() => setConfirm((c) => (c === ticker ? null : c)), 2500)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Positions, performance and multi-dimensional exposure with ETF look-through.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetPortfolio()
              toast.success("Portfolio reset to the starting Stake snapshot")
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset starting data
          </Button>
          <AddHoldingDialog />
        </div>
      </div>

      <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
        Holdings are seeded from the Stake screenshots shared in ChatGPT. Quantities are high-confidence; average costs are approximate until confirmed against an official Stake statement. Market prices remain demo data.
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Value" value={fmtCurrency(totalValue, "USD", 0)} sub={<span>Incl. {fmtCompact(cash)} cash</span>} />
        <StatCard
          label="Invested"
          value={fmtCurrency(portfolio.investedValue, "USD", 0)}
          sub={<span>{positions.length} positions</span>}
        />
        <StatCard
          label="Unrealised P/L"
          value={fmtCurrency(totalPL, "USD", 0)}
          accent={totalPL >= 0 ? "positive" : "negative"}
          sub={<DeltaText value={totalPLPct} />}
        />
        <StatCard
          label="Day Change"
          value={fmtCurrency(portfolio.dayChangeValue, "USD", 0)}
          accent={portfolio.dayChangeValue >= 0 ? "positive" : "negative"}
          sub={<DeltaText value={portfolio.dayChangePct} />}
        />
      </div>

      <Panel title="Holdings" description="Weighted-average cost basis. Click a ticker to analyse.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead className="hidden md:table-cell">Sector</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Day</TableHead>
                <TableHead className="text-right">Unreal. P/L</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => (
                <TableRow key={p.ticker}>
                  <TableCell>
                    <Link href={`/analyse?ticker=${p.ticker}`} className="font-mono font-semibold hover:underline">
                      {p.ticker}
                    </Link>
                    <span className="ml-2 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      {p.instrument.type === "etf" ? "ETF" : "Stock"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{p.instrument.sector}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCurrency(p.avgCost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCurrency(p.price)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(p.marketValue, "USD", 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(p.weight)}</TableCell>
                  <TableCell className="text-right"><DeltaText value={p.dayChangePct} /></TableCell>
                  <TableCell className="text-right">
                    <div><DeltaText value={p.unrealisedPLPct} /></div>
                    <div className="text-xs text-muted-foreground tabular-nums">{fmtCurrency(p.unrealisedPL, "USD", 0)}</div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={confirm === p.ticker ? "destructive" : "ghost"}
                      size="icon-sm"
                      onClick={() => handleRemove(p.ticker)}
                      aria-label={`Remove ${p.ticker}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Panel title="Exposure analysis" description="Diversification across multiple dimensions, including look-through into ETF underlyings.">
        <Tabs defaultValue="sector" className="p-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="sector">Sector</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
            <TabsTrigger value="country">Country</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="lookThrough">Look-through</TabsTrigger>
          </TabsList>
          <TabsContent value="sector" className="pt-4">
            <AllocationDonut data={exposure.sector} />
          </TabsContent>
          <TabsContent value="type" className="pt-4">
            <AllocationDonut data={exposure.type} />
          </TabsContent>
          <TabsContent value="country" className="pt-4">
            <AllocationDonut data={exposure.country} />
          </TabsContent>
          <TabsContent value="currency" className="pt-4">
            <AllocationDonut data={exposure.currency} />
          </TabsContent>
          <TabsContent value="theme" className="pt-4">
            <ExposureBars data={exposure.theme} />
          </TabsContent>
          <TabsContent value="lookThrough" className="pt-4">
            <p className="mb-3 text-xs text-muted-foreground text-pretty">
              True company-level exposure combining direct stock holdings with decomposed ETF constituents.
            </p>
            <ExposureBars data={exposure.lookThrough} />
          </TabsContent>
        </Tabs>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <ConcentrationCard label="Semiconductor exposure" pct={exposure.semiconductor} threshold={25} />
        <ConcentrationCard label="Energy exposure" pct={exposure.energy} threshold={20} />
        <ConcentrationCard label="Gold / hard assets" pct={exposure.gold} threshold={20} />
      </div>
    </div>
  )
}

function ExposureBars({ data }: { data: Allocation[] }) {
  const max = Math.max(...data.map((d) => d.pct), 1)
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[10rem_1fr_auto] items-center gap-3">
          <span className="truncate text-sm">{d.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(d.pct / max) * 100}%` }} />
          </div>
          <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">{fmtPct(d.pct)}</span>
        </li>
      ))}
    </ul>
  )
}

function ConcentrationCard({ label, pct, threshold }: { label: string; pct: number; threshold: number }) {
  const over = pct > threshold
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`font-mono text-sm font-bold tabular-nums ${over ? "text-negative" : "text-foreground"}`}>
          {fmtPct(pct)}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${over ? "bg-negative" : "bg-positive"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {over ? `Above ${threshold}% comfort threshold` : `Within ${threshold}% threshold`}
      </p>
    </div>
  )
}
