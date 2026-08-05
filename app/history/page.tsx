"use client"

import { useMemo, useState } from "react"
import { useDios } from "@/components/dios/store"
import type { RecommendationExecutionStatus, RecommendationRecord } from "@/lib/dios/types"
import { Panel, RecommendationBadge, ScorePill, StatCard } from "@/components/dios/ui-bits"
import { ScenarioView } from "@/components/dios/scenario-view"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { fmtCurrency, fmtDateTime, fmtPct } from "@/lib/format"

function outcomeColor(v: number | null) {
  if (v === null) return "text-muted-foreground"
  return v >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
}
function fmtOutcome(v: number | null) { return v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` }
function verdict(r: RecommendationRecord): "correct" | "wrong" | "pending" {
  const o = r.outcomes.m3 ?? r.outcomes.m1
  if (o === null) return "pending"
  const positive = ["Strong Buy", "Buy", "Start Small", "Buy Watch"].includes(r.recommendation)
  const negative = ["Sell", "Avoid", "Reduce"].includes(r.recommendation)
  if (positive) return o > 0 ? "correct" : "wrong"
  if (negative) return o < 0 ? "correct" : "wrong"
  return Math.abs(o) < 5 ? "correct" : "wrong"
}

export default function HistoryPage() {
  const { recommendations, updateRecommendation } = useDios()
  const [selected, setSelected] = useState<RecommendationRecord | null>(null)
  const [notes, setNotes] = useState("")

  const stats = useMemo(() => {
    const scored = recommendations.filter((r) => verdict(r) !== "pending")
    const correct = scored.filter((r) => verdict(r) === "correct").length
    const hitRate = scored.length ? (correct / scored.length) * 100 : 0
    const realized = recommendations.map((r) => r.outcomes.m3 ?? r.outcomes.m1).filter((v): v is number => v !== null)
    const gains = realized.filter((v) => v > 0)
    const losses = realized.filter((v) => v < 0)
    return {
      total: recommendations.length,
      hitRate,
      scored: scored.length,
      avgGain: gains.length ? gains.reduce((s, v) => s + v, 0) / gains.length : 0,
      avgLoss: losses.length ? losses.reduce((s, v) => s + v, 0) / losses.length : 0,
    }
  }, [recommendations])

  const buckets = useMemo(() => [
    { label: "80–100", min: 80, max: 101 },
    { label: "65–79", min: 65, max: 80 },
    { label: "50–64", min: 50, max: 65 },
    { label: "0–49", min: 0, max: 50 },
  ].map((d) => {
    const group = recommendations.filter((r) => r.overallScore >= d.min && r.overallScore < d.max)
    const scored = group.filter((r) => verdict(r) !== "pending")
    const correct = scored.filter((r) => verdict(r) === "correct").length
    return { ...d, count: group.length, hitRate: scored.length ? correct / scored.length * 100 : null }
  }), [recommendations])

  function openRecord(record: RecommendationRecord) {
    setSelected(record)
    setNotes(record.executionNotes ?? "")
  }

  function setExecution(status: RecommendationExecutionStatus) {
    if (!selected) return
    updateRecommendation(selected.id, { executionStatus: status })
    setSelected({ ...selected, executionStatus: status })
  }

  function saveNotes() {
    if (!selected) return
    updateRecommendation(selected.id, { executionNotes: notes })
    setSelected({ ...selected, executionNotes: notes })
  }

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Investment Decision Tracker</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track each Fundly recommendation, its data sources, investor action and measured outcome.</p>
    </div>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Recommendations" value={stats.total} sub={`${stats.scored} measured`} />
      <StatCard label="Success rate" value={fmtPct(stats.hitRate, 0)} sub="Direction correct" accent={stats.hitRate >= 55 ? "positive" : "warning"} />
      <StatCard label="Average gain" value={`+${stats.avgGain.toFixed(1)}%`} sub="Positive measured calls" accent="positive" />
      <StatCard label="Average loss" value={`${stats.avgLoss.toFixed(1)}%`} sub="Negative measured calls" accent="negative" />
    </div>

    <Panel title="Confidence calibration" description="Checks whether higher Fundly scores have produced better outcomes.">
      <div className="space-y-3 p-4">{buckets.map((b) => <div key={b.label} className="flex items-center gap-4">
        <span className="w-24 text-sm">{b.label}</span><span className="w-16 font-mono text-xs text-muted-foreground">{b.count} calls</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{width: `${b.hitRate ?? 0}%`}} /></div>
        <span className="w-14 text-right font-mono text-sm">{b.hitRate === null ? "n/a" : `${b.hitRate.toFixed(0)}%`}</span>
      </div>)}</div>
    </Panel>

    <Panel title="Decision log" description="Click a row to inspect rationale, sources and record whether the recommendation was followed.">
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground">
        <th className="px-4 py-2">Date</th><th className="px-4 py-2">Ticker</th><th className="px-4 py-2">Recommendation</th><th className="px-4 py-2">Action</th><th className="px-4 py-2 text-right">Confidence</th><th className="px-4 py-2 text-right">3M/1M</th><th className="px-4 py-2">Result</th>
      </tr></thead><tbody>{recommendations.map((r) => {
        const v=verdict(r); const out=r.outcomes.m3 ?? r.outcomes.m1
        return <tr key={r.id} onClick={()=>openRecord(r)} className="cursor-pointer border-b hover:bg-muted/50">
          <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(r.datetime)}</td><td className="px-4 py-3 font-mono font-semibold">{r.ticker}</td>
          <td className="px-4 py-3"><RecommendationBadge value={r.recommendation}/></td><td className="px-4 py-3"><Badge variant="outline">{r.executionStatus ?? "Pending"}</Badge></td>
          <td className="px-4 py-3 text-right font-mono">{r.confidence}%</td><td className={`px-4 py-3 text-right font-mono ${outcomeColor(out)}`}>{fmtOutcome(out)}</td>
          <td className="px-4 py-3"><Badge variant="outline">{v}</Badge></td>
        </tr>
      })}</tbody></table></div>
    </Panel>

    <Dialog open={selected !== null} onOpenChange={(o)=>!o&&setSelected(null)}><DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">{selected && <>
      <DialogHeader><DialogTitle className="flex items-center gap-2"><span className="font-mono">{selected.ticker}</span><RecommendationBadge value={selected.recommendation}/><ScorePill score={selected.overallScore}/></DialogTitle>
      <DialogDescription>{fmtDateTime(selected.datetime)} · {selected.sector} · Price {fmtCurrency(selected.priceAtRec)}</DialogDescription></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Confidence</p><p className="text-xl font-semibold">{selected.confidence}%</p></div><div><p className="text-xs text-muted-foreground">Suggested weight</p><p className="text-xl font-semibold">{fmtPct(selected.suggestedWeight)}</p></div><div><p className="text-xs text-muted-foreground">Execution</p><Select value={selected.executionStatus ?? "Pending"} onValueChange={(v)=>setExecution(v as RecommendationExecutionStatus)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Pending","Executed","Partially Executed","Ignored"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div></div>
      <div><h4 className="mb-2 text-sm font-semibold">Why Fundly made this call</h4><ul className="space-y-1 text-sm text-muted-foreground">{selected.reasons.map((x,i)=><li key={i}>+ {x}</li>)}</ul></div>
      <div><h4 className="mb-2 text-sm font-semibold">Confidence contributors</h4><ul className="space-y-1 text-sm text-muted-foreground">{(selected.confidenceContributors ?? [...selected.reasons.slice(0,3), ...selected.risks.slice(0,2)]).map((x,i)=><li key={i}>{x}</li>)}</ul></div>
      <div><h4 className="mb-2 text-sm font-semibold">Sources</h4><div className="flex flex-wrap gap-2">{(selected.sourceNames?.length ? selected.sourceNames : ["Fundly Decision Engine"]).map(s=><Badge key={s} variant="secondary">{s}</Badge>)}</div></div>
      <div><h4 className="mb-2 text-sm font-semibold">Risks flagged</h4><ul className="space-y-1 text-sm text-muted-foreground">{selected.risks.map((x,i)=><li key={i}>− {x}</li>)}</ul></div>
      <ScenarioView scenarios={selected.scenarios}/>
      <div><h4 className="mb-2 text-sm font-semibold">Investor action notes</h4><Textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Why the recommendation was followed, ignored or partially executed..."/><Button className="mt-2" onClick={saveNotes}>Save action notes</Button></div>
    </>}</DialogContent></Dialog>
  </div>
}
