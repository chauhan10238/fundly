"use client"

import { useMemo, useState } from "react"
import { useDios } from "@/components/dios/store"
import type { RecommendationRecord } from "@/lib/dios/types"
import { Panel, RecommendationBadge, ScorePill, StatCard } from "@/components/dios/ui-bits"
import { ScenarioView } from "@/components/dios/scenario-view"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { fmtCurrency, fmtDateTime, fmtPct } from "@/lib/format"

function outcomeColor(v: number | null) {
  if (v === null) return "text-muted-foreground"
  return v >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
}

function fmtOutcome(v: number | null) {
  if (v === null) return "—"
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
}

// A recommendation is "correct" if a bullish call went up (or a bearish call went down) at 3 months.
function verdict(r: RecommendationRecord): "correct" | "wrong" | "pending" {
  const o = r.outcomes.m3 ?? r.outcomes.m1 ?? r.outcomes.w1
  if (o === null || o === undefined) return "pending"
  const bullish = ["Strong Buy", "Buy", "Buy Watch"].includes(r.recommendation)
  const bearish = ["Reduce", "Sell", "Avoid"].includes(r.recommendation)
  if (bullish) return o >= 0 ? "correct" : "wrong"
  if (bearish) return o <= 0 ? "correct" : "wrong"
  return Math.abs(o) < 5 ? "correct" : "wrong"
}

export default function HistoryPage() {
  const { recommendations } = useDios()
  const [selected, setSelected] = useState<RecommendationRecord | null>(null)

  const stats = useMemo(() => {
    const scored = recommendations.filter((r) => verdict(r) !== "pending")
    const correct = scored.filter((r) => verdict(r) === "correct").length
    const hitRate = scored.length ? (correct / scored.length) * 100 : 0
    const avgScore = recommendations.length
      ? recommendations.reduce((s, r) => s + r.overallScore, 0) / recommendations.length
      : 0
    const realized = recommendations
      .map((r) => r.outcomes.m3 ?? r.outcomes.m1)
      .filter((v): v is number => v !== null && v !== undefined)
    const avgReturn = realized.length ? realized.reduce((s, v) => s + v, 0) / realized.length : 0
    return { total: recommendations.length, hitRate, avgScore, avgReturn, scored: scored.length }
  }, [recommendations])

  // Calibration by score bucket.
  const buckets = useMemo(() => {
    const defs = [
      { label: "80–100 (Strong)", min: 80, max: 101 },
      { label: "65–79 (Buy)", min: 65, max: 80 },
      { label: "50–64 (Neutral)", min: 50, max: 65 },
      { label: "0–49 (Avoid)", min: 0, max: 50 },
    ]
    return defs.map((d) => {
      const inBucket = recommendations.filter((r) => r.overallScore >= d.min && r.overallScore < d.max)
      const scored = inBucket.filter((r) => verdict(r) !== "pending")
      const correct = scored.filter((r) => verdict(r) === "correct").length
      return {
        label: d.label,
        count: inBucket.length,
        hitRate: scored.length ? (correct / scored.length) * 100 : null,
      }
    })
  }, [recommendations])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Recommendation History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every analysis is logged with the price, score and scenarios at the time, then tracked against realized outcomes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Logged calls" value={stats.total} sub={`${stats.scored} with outcomes`} />
        <StatCard
          label="Hit rate"
          value={fmtPct(stats.hitRate, 0)}
          sub="Direction correct at 3M"
          accent={stats.hitRate >= 55 ? "positive" : stats.hitRate >= 45 ? "warning" : "negative"}
        />
        <StatCard label="Avg score" value={stats.avgScore.toFixed(0)} sub="Across all calls" />
        <StatCard
          label="Avg realized"
          value={`${stats.avgReturn >= 0 ? "+" : ""}${stats.avgReturn.toFixed(1)}%`}
          sub="Mean 3M/1M return"
          accent={stats.avgReturn >= 0 ? "positive" : "negative"}
        />
      </div>

      <Panel title="Score calibration" description="Are higher scores actually associated with better outcomes? This is the honesty check.">
        <div className="space-y-3 p-4">
          {buckets.map((b) => (
            <div key={b.label} className="flex items-center gap-4">
              <span className="w-40 shrink-0 text-sm text-foreground">{b.label}</span>
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{b.count} calls</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: b.hitRate === null ? "0%" : `${b.hitRate}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-sm font-medium text-foreground">
                {b.hitRate === null ? "n/a" : `${b.hitRate.toFixed(0)}%`}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Call log" description="Newest first. Click a row to inspect the full snapshot and scenarios.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Ticker</th>
                <th className="px-4 py-2 font-medium">Call</th>
                <th className="px-4 py-2 text-right font-medium">Score</th>
                <th className="px-4 py-2 text-right font-medium">Price</th>
                <th className="px-4 py-2 text-right font-medium">1W</th>
                <th className="px-4 py-2 text-right font-medium">1M</th>
                <th className="px-4 py-2 text-right font-medium">3M</th>
                <th className="px-4 py-2 text-center font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((r) => {
                const v = verdict(r)
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDateTime(r.datetime)}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{r.ticker}</td>
                    <td className="px-4 py-3">
                      <RecommendationBadge value={r.recommendation} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ScorePill score={r.overallScore} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmtCurrency(r.priceAtRec)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${outcomeColor(r.outcomes.w1)}`}>{fmtOutcome(r.outcomes.w1)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${outcomeColor(r.outcomes.m1)}`}>{fmtOutcome(r.outcomes.m1)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${outcomeColor(r.outcomes.m3)}`}>{fmtOutcome(r.outcomes.m3)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          v === "correct"
                            ? "border-[var(--positive)]/40 text-[var(--positive)]"
                            : v === "wrong"
                              ? "border-[var(--negative)]/40 text-[var(--negative)]"
                              : "border-border text-muted-foreground"
                        }
                      >
                        {v}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">{selected.ticker}</span>
                  <RecommendationBadge value={selected.recommendation} />
                  <ScorePill score={selected.overallScore} />
                </DialogTitle>
                <DialogDescription>
                  {fmtDateTime(selected.datetime)} · {selected.sector} · {selected.macroRegime}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Price at call</p>
                    <p className="font-mono font-medium text-foreground">{fmtCurrency(selected.priceAtRec)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Suggested weight</p>
                    <p className="font-mono font-medium text-foreground">{fmtPct(selected.suggestedWeight)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="font-mono font-medium text-foreground">{selected.confidence}%</p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-1 text-sm font-semibold text-foreground">Reasons at the time</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selected.reasons.map((x, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[var(--positive)]">+</span>
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="mb-1 text-sm font-semibold text-foreground">Risks flagged</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selected.risks.map((x, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[var(--negative)]">−</span>
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>

                <ScenarioView scenarios={selected.scenarios} />

                <p className="text-[11px] text-muted-foreground">
                  {selected.modelVersion} · {selected.scoringVersion}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
