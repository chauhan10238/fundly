"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useDios } from "@/components/dios/store"
import { runScan } from "@/lib/dios/scan"
import type { ScanResult } from "@/lib/dios/types"
import { Panel, RecommendationBadge, RiskBadge, ScorePill } from "@/components/dios/ui-bits"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, TrendingUp, Eye, AlertTriangle, ShieldAlert, ArrowUpRight } from "lucide-react"
import { LAST_REFRESH } from "@/lib/dios/macro"
import { fmtDateTime } from "@/lib/format"

function ScanRow({ r }: { r: ScanResult }) {
  return (
    <Link
      href={`/analyse?ticker=${r.ticker}`}
      className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-muted/50"
    >
      <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground">{r.rank}</span>
      <div className="w-40 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-semibold text-foreground">{r.ticker}</span>
          {r.freshCatalyst && <Zap className="h-3 w-3 text-[var(--warning)]" aria-label="Fresh catalyst" />}
        </div>
        <div className="truncate text-xs text-muted-foreground">{r.name}</div>
      </div>
      <ScorePill score={r.overallScore} size="sm" />
      <div className="hidden min-w-0 flex-1 md:block">
        <p className="truncate text-xs text-muted-foreground">{r.whyToday}</p>
        <p className="truncate text-[11px] text-[var(--negative)]/80">Risk: {r.mainRisk}</p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <RiskBadge band={r.riskBand} />
        <RecommendationBadge value={r.recommendation} />
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </Link>
  )
}

const SECTIONS = [
  { key: "topOpportunities", label: "Top Opportunities", icon: TrendingUp, tone: "text-[var(--positive)]" },
  { key: "topWatchlist", label: "Watchlist (unheld)", icon: Eye, tone: "text-primary" },
  { key: "holdingsAttention", label: "Holdings Needing Attention", icon: AlertTriangle, tone: "text-[var(--warning)]" },
  { key: "avoidList", label: "Avoid / Reduce", icon: ShieldAlert, tone: "text-[var(--negative)]" },
] as const

export default function ScanPage() {
  const { portfolio, settings } = useDios()
  const scan = useMemo(() => runScan(portfolio, settings), [portfolio, settings])
  const [active, setActive] = useState<(typeof SECTIONS)[number]["key"]>("topOpportunities")

  const activeList = scan[active]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Daily Market Scan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {"Full universe ranked by risk-adjusted score, filtered against your portfolio. Last run "}
          {fmtDateTime(LAST_REFRESH)}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SECTIONS.map((s) => {
          const count = scan[s.key].length
          const Icon = s.icon
          return (
            <button key={s.key} type="button" onClick={() => setActive(s.key)} className="text-left">
              <Card
                className={
                  active === s.key
                    ? "border-primary ring-1 ring-primary transition-colors"
                    : "transition-colors hover:border-muted-foreground/40"
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${s.tone}`} />
                    <span className="text-2xl font-semibold tabular-nums text-foreground">{count}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      <Panel
        title={SECTIONS.find((s) => s.key === active)?.label ?? ""}
        description="Click any row to open the full analysis. Scores are risk-adjusted."
      >
        {activeList.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing in this bucket right now.</p>
        ) : (
          <div>
            {activeList.map((r) => (
              <ScanRow key={r.ticker} r={r} />
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Tactical / Leveraged Watch"
        description="Higher-risk, short-horizon instruments. Position sizing and stops are non-negotiable here."
      >
        <div>
          {scan.tactical.map((r) => (
            <div key={r.ticker} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <div className="w-40 shrink-0">
                <span className="font-mono text-sm font-semibold text-foreground">{r.ticker}</span>
                <div className="truncate text-xs text-muted-foreground">{r.name}</div>
              </div>
              <ScorePill score={r.overallScore} size="sm" />
              <div className="hidden min-w-0 flex-1 sm:block">
                <p className="truncate text-xs text-[var(--negative)]/80">Risk: {r.mainRisk}</p>
              </div>
              <Badge variant="outline" className="ml-auto shrink-0 border-[var(--warning)]/40 text-[var(--warning)]">
                Tactical
              </Badge>
              <RecommendationBadge value={r.recommendation} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
