"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useDios } from "@/components/dios/store"
import { EARNINGS } from "@/lib/dios/earnings"
import type { EarningsEvent } from "@/lib/dios/types"
import { Panel } from "@/components/dios/ui-bits"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fmtDate } from "@/lib/format"
import { CalendarClock, TrendingUp, TrendingDown, ArrowUpRight, Waypoints } from "lucide-react"
import { cn } from "@/lib/utils"

function moveColor(m: number) {
  if (m >= 9) return "text-[var(--negative)]"
  if (m >= 6) return "text-[var(--warning)]"
  return "text-foreground"
}

function EventCard({
  ev,
  held,
  selected,
  onSelect,
}: {
  ev: EarningsEvent
  held: boolean
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button type="button" onClick={onSelect} className="w-full text-left">
      <Card className={cn("transition-colors", selected ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/40")}>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-foreground">{ev.ticker}</span>
              {held && <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Held</Badge>}
              {ev.reported && (
                <Badge variant="outline" className="border-[var(--positive)]/40 text-[var(--positive)]">
                  Reported
                </Badge>
              )}
            </div>
            <span className="font-mono text-xs text-muted-foreground">{ev.time}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{ev.name}</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{fmtDate(ev.date)}</span>
            <span className={cn("font-mono font-medium", moveColor(ev.expectedMove))}>±{ev.expectedMove}%</span>
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            {ev.inEtfs.slice(0, 5).map((e) => (
              <span key={e} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {e}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

export default function EarningsPage() {
  const { portfolio } = useDios()
  const heldTickers = useMemo(() => new Set(portfolio.positions.map((p) => p.ticker)), [portfolio])
  const [selected, setSelected] = useState<string>(EARNINGS.find((e) => e.reported)?.ticker ?? EARNINGS[0].ticker)
  const active = EARNINGS.find((e) => e.ticker === selected)!

  const affectsHeld = (ev: EarningsEvent) => ev.inEtfs.some((e) => heldTickers.has(e)) || heldTickers.has(ev.ticker)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Earnings Intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming prints, implied moves, and cross-holding ripple analysis for results that matter to your book.
        </p>
      </div>

      <Panel
        title="Earnings calendar"
        description="Highlighted names affect your portfolio directly or via ETF look-through."
      >
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {EARNINGS.map((ev) => (
            <EventCard
              key={ev.ticker}
              ev={ev}
              held={affectsHeld(ev)}
              selected={selected === ev.ticker}
              onSelect={() => setSelected(ev.ticker)}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title={`${active.ticker} — ${active.name}`}
        description={active.reported ? "Results reported. Ripple analysis below." : "Pre-print. Consensus and positioning guidance below."}
        action={
          <Link
            href={`/analyse?ticker=${active.ticker}`}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Full analysis <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Report date</p>
            <p className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              {fmtDate(active.date)} · {active.time}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Implied move</p>
            <p className={cn("mt-0.5 font-mono font-medium", moveColor(active.expectedMove))}>±{active.expectedMove}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">EPS consensus</p>
            <p className="mt-0.5 font-mono font-medium text-foreground">{active.epsConsensus}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Revenue consensus</p>
            <p className="mt-0.5 font-mono font-medium text-foreground">{active.revenueConsensus}</p>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Positioning guidance</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground text-pretty">{active.recommendation}</p>
        </div>

        {active.reported && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Rev vs cons." value={active.reported.revenueVsConsensus} suffix="%" positive={active.reported.revenueVsConsensus >= 0} />
              <Metric label="EPS vs cons." value={active.reported.epsVsConsensus} suffix="%" positive={active.reported.epsVsConsensus >= 0} />
              <Metric label="Gross margin" value={active.reported.grossMargin} suffix="%" plain />
              <Metric label="Op. margin" value={active.reported.operatingMargin} suffix="%" plain />
            </div>

            <div className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Guidance</span>
                <Badge
                  className={cn(
                    active.reported.guidance === "raised" && "bg-[var(--positive)]/10 text-[var(--positive)] hover:bg-[var(--positive)]/10",
                    active.reported.guidance === "cut" && "bg-[var(--negative)]/10 text-[var(--negative)] hover:bg-[var(--negative)]/10",
                    active.reported.guidance === "maintained" && "bg-muted text-muted-foreground hover:bg-muted",
                  )}
                >
                  {active.reported.guidance}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground text-pretty">{active.reported.commentary}</p>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Waypoints className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Ripple effects across the universe</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Second-order read-through to related names and the ETFs you hold.
              </p>
              <div className="mt-3 space-y-2">
                {active.reported.ripple.map((r) => {
                  const isHeld = heldTickers.has(r.ticker)
                  return (
                    <div key={r.ticker} className="flex items-start gap-3 rounded-md border border-border p-3">
                      {r.direction === "positive" ? (
                        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--positive)]" />
                      ) : (
                        <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--negative)]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">{r.ticker}</span>
                          {isHeld && <Badge className="bg-primary/10 text-primary hover:bg-primary/10">In book</Badge>}
                          <span className="ml-auto font-mono text-xs text-muted-foreground">
                            impact {r.impactScore}/10 · {r.duration}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-foreground text-pretty">{r.explanation}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Source: {r.evidence}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        </div>
      </Panel>
    </div>
  )
}

function Metric({
  label,
  value,
  suffix,
  positive,
  plain,
}: {
  label: string
  value: number
  suffix?: string
  positive?: boolean
  plain?: boolean
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-lg font-semibold tabular-nums",
          plain ? "text-foreground" : positive ? "text-[var(--positive)]" : "text-[var(--negative)]",
        )}
      >
        {!plain && positive ? "+" : ""}
        {value}
        {suffix}
      </p>
    </div>
  )
}
