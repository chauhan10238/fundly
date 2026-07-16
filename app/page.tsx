"use client"

import Link from "next/link"
import { useMemo } from "react"
import { AlertTriangle, ArrowUpRight, Search, TrendingUp } from "lucide-react"
import { useDios } from "@/components/dios/store"
import { runScan } from "@/lib/dios/scan"
import { MACRO, GEO } from "@/lib/dios/macro"
import { fmtCompact, fmtCurrency, fmtPct } from "@/lib/format"
import {
  ButtonLink,
  DeltaText,
  Panel,
  RecommendationBadge,
  RiskBadge,
  ScorePill,
  StatCard,
} from "@/components/dios/ui-bits"
import { AllocationDonut } from "@/components/dios/allocation-donut"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function DashboardPage() {
  const { portfolio, settings } = useDios()
  const scan = useMemo(() => runScan(portfolio, settings), [portfolio, settings])

  const { totalValue, totalPL, totalPLPct, dayChangeValue, dayChangePct, cash, exposure } = portfolio

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Command Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Portfolio health, live opportunities and risk oversight in one view.
          </p>
        </div>
        <ButtonLink href="/analyse">
          <Search className="h-4 w-4" />
          Analyse an instrument
        </ButtonLink>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Value"
          value={fmtCurrency(totalValue, "USD", 0)}
          sub={
            <span>
              Today <DeltaText value={dayChangePct} /> ({fmtCurrency(dayChangeValue, "USD", 0)})
            </span>
          }
        />
        <StatCard
          label="Unrealised P/L"
          value={fmtCurrency(totalPL, "USD", 0)}
          accent={totalPL >= 0 ? "positive" : "negative"}
          sub={<DeltaText value={totalPLPct} />}
        />
        <StatCard
          label="Cash"
          value={fmtCurrency(cash, "USD", 0)}
          sub={<span>{fmtPct((cash / totalValue) * 100)} of portfolio</span>}
        />
        <StatCard
          label="Open Warnings"
          value={portfolio.warnings.length}
          accent={portfolio.warnings.length ? "warning" : "default"}
          sub={<span>{portfolio.warnings.filter((w) => w.severity === "high").length} high severity</span>}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: opportunities + holdings */}
        <div className="space-y-6 lg:col-span-2">
          <Panel
            title="Top Opportunities Today"
            description="Highest risk-adjusted scores across the tracked universe."
            action={
              <ButtonLink href="/scan" variant="ghost" size="sm">
                View scan <ArrowUpRight className="h-3.5 w-3.5" />
              </ButtonLink>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead className="hidden md:table-cell">Why today</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scan.topOpportunities.slice(0, 6).map((r) => (
                  <TableRow key={r.ticker}>
                    <TableCell className="text-muted-foreground tabular-nums">{r.rank}</TableCell>
                    <TableCell>
                      <Link href={`/analyse?ticker=${r.ticker}`} className="group block">
                        <span className="font-mono font-semibold group-hover:underline">{r.ticker}</span>
                        <span className="block max-w-[10rem] truncate text-xs text-muted-foreground">{r.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <ScorePill score={r.overallScore} />
                    </TableCell>
                    <TableCell>
                      <RecommendationBadge value={r.recommendation} />
                    </TableCell>
                    <TableCell className="hidden max-w-[16rem] text-xs text-muted-foreground md:table-cell">
                      {r.whyToday}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>

          <Panel
            title="Holdings"
            description={`${portfolio.positions.length} positions · ${fmtCompact(portfolio.investedValue)} invested`}
            action={
              <ButtonLink href="/portfolio" variant="ghost" size="sm">
                Manage <ArrowUpRight className="h-3.5 w-3.5" />
              </ButtonLink>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Day</TableHead>
                  <TableHead className="text-right">Unreal. P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolio.positions.map((p) => (
                  <TableRow key={p.ticker}>
                    <TableCell>
                      <Link href={`/analyse?ticker=${p.ticker}`} className="font-mono font-semibold hover:underline">
                        {p.ticker}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.instrument.type === "etf" ? "ETF" : p.instrument.sector}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(p.marketValue, "USD", 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(p.weight)}</TableCell>
                    <TableCell className="text-right">
                      <DeltaText value={p.dayChangePct} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeltaText value={p.unrealisedPLPct} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>

        {/* Right: risk + macro + allocation */}
        <div className="space-y-6">
          <Panel title="Risk Warnings" description="Rule breaches and thesis alerts.">
            <div className="divide-y divide-border">
              {portfolio.warnings.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No active warnings. Portfolio within all rules.</p>
              )}
              {portfolio.warnings.map((w) => (
                <div key={w.id} className="flex gap-3 p-4">
                  <AlertTriangle
                    className={
                      w.severity === "high"
                        ? "h-4 w-4 shrink-0 text-negative"
                        : w.severity === "medium"
                          ? "h-4 w-4 shrink-0 text-warning-foreground"
                          : "h-4 w-4 shrink-0 text-muted-foreground"
                    }
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-tight">{w.title}</p>
                      <RiskBadge band={w.severity} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground text-pretty">{w.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Sector Allocation">
            <div className="p-4">
              <AllocationDonut data={exposure.sector} />
            </div>
          </Panel>

          <Panel title="Market Regime">
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{MACRO.regime}</span>
              </div>
              <p className="text-xs text-muted-foreground text-pretty">{MACRO.summary}</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {MACRO.drivers.slice(0, 6).map((d) => (
                  <div key={d.label} className="rounded-md border border-border bg-muted/40 p-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.label}</div>
                    <div className="font-mono text-sm font-semibold">{d.value}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-2.5">
                <div>
                  <div className="text-xs font-medium">Geopolitical risk</div>
                  <div className="text-[11px] text-muted-foreground">{GEO.level}</div>
                </div>
                <RiskBadge
                  band={
                    GEO.level === "High" || GEO.level === "Elevated"
                      ? "high"
                      : GEO.level === "Moderate"
                        ? "medium"
                        : "low"
                  }
                />
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        DIOS is a personal decision-support tool using illustrative demo data. Nothing here is investment advice.
      </p>
    </div>
  )
}
