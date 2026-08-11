"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useDios } from "@/components/dios/store"
import type { RecommendationExecutionStatus, RecommendationRecord } from "@/lib/dios/types"
import { Panel, RecommendationBadge, ScorePill, StatCard } from "@/components/dios/ui-bits"
import { ScenarioView } from "@/components/dios/scenario-view"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { fmtCurrency, fmtDateTime, fmtPct } from "@/lib/format"

const POSITIVE_CALLS = ["Strong Buy", "Buy", "Start Small", "Buy Watch"]
const NEGATIVE_CALLS = ["Sell", "Avoid", "Reduce"]
const FOLLOWED_STATUSES: RecommendationExecutionStatus[] = ["Executed", "Partially Executed", "Already Own"]

function normalizedStatus(status?: RecommendationExecutionStatus): RecommendationExecutionStatus {
  return !status || status === "Pending" ? "Awaiting Decision" : status
}
function isMeasured(r: RecommendationRecord) { return (r.outcomes.m3 ?? r.outcomes.m1 ?? r.outcomes.w1 ?? r.outcomes.d1) !== null }
function primaryOutcome(r: RecommendationRecord) {
  return r.outcomes.m12 ?? r.outcomes.m6 ?? r.outcomes.m3 ?? r.outcomes.m1 ?? r.outcomes.w1 ?? r.outcomes.d1
}
function callWasCorrect(r: RecommendationRecord) {
  const o = primaryOutcome(r)
  if (o === null) return null
  if (POSITIVE_CALLS.includes(r.recommendation)) return o > 0
  if (NEGATIVE_CALLS.includes(r.recommendation)) return o < 0
  return Math.abs(o) < 5
}
function outcomeColor(v: number | null) {
  if (v === null) return "text-muted-foreground"
  return v >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
}
function fmtOutcome(v: number | null) { return v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` }

function recommendationValue(r: RecommendationRecord) {
  const outcome = primaryOutcome(r)
  if (outcome === null) return null
  if (POSITIVE_CALLS.includes(r.recommendation)) return outcome
  if (NEGATIVE_CALLS.includes(r.recommendation)) return -outcome
  return Math.abs(outcome) < 5 ? 5 - Math.abs(outcome) : -Math.abs(outcome)
}

function ignoredDecisionWasGood(r: RecommendationRecord) {
  if (normalizedStatus(r.executionStatus) !== "Ignored") return null
  const outcome = primaryOutcome(r)
  if (outcome === null) return null
  if (POSITIVE_CALLS.includes(r.recommendation)) return outcome <= 0
  if (NEGATIVE_CALLS.includes(r.recommendation)) return outcome >= 0
  return Math.abs(outcome) >= 5
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function resultLabel(r: RecommendationRecord) {
  const status = normalizedStatus(r.executionStatus)
  const o = primaryOutcome(r)
  if (o === null) return "Tracking"
  const correct = callWasCorrect(r)
  if (status === "Ignored") {
    if (POSITIVE_CALLS.includes(r.recommendation)) return o > 0 ? "Missed opportunity" : "Avoided loss"
    if (NEGATIVE_CALLS.includes(r.recommendation)) return o < 0 ? "Missed protection" : "Good to ignore"
    return "Ignored outcome"
  }
  if (status === "Watching" || status === "Awaiting Decision") return correct ? "Call correct" : "Call incorrect"
  return correct ? "Successful" : "Unsuccessful"
}

function statusTone(status: RecommendationExecutionStatus) {
  if (FOLLOWED_STATUSES.includes(status)) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "Ignored") return "bg-rose-50 text-rose-700 border-rose-200"
  if (status === "Watching") return "bg-amber-50 text-amber-700 border-amber-200"
  return ""
}

export default function HistoryPage() {
  const { recommendations, updateRecommendation, hydrated } = useDios()
  const [selected, setSelected] = useState<RecommendationRecord | null>(null)
  const [notes, setNotes] = useState("")
  const [executionPrice, setExecutionPrice] = useState("")
  const [executionQuantity, setExecutionQuantity] = useState("")
  const measurementRunRef = useRef(false)

  useEffect(() => {
    if (!hydrated || measurementRunRef.current || recommendations.length === 0) return
    const now = Date.now()
    const horizons = [["d1",1],["w1",7],["m1",30],["m3",90],["m6",180],["m12",365]] as const
    const due = recommendations.filter((record) => {
      const ageDays = (now - new Date(record.datetime).getTime()) / 86_400_000
      return horizons.some(([key, days]) => ageDays >= days && record.outcomes[key] === null)
    })
    if (!due.length) return
    measurementRunRef.current = true
    const symbols = Array.from(new Set(due.map((r) => r.ticker))).join(",")
    void fetch(`/api/quotes?symbols=${encodeURIComponent(symbols)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Quote request failed (${response.status})`)
        return response.json() as Promise<{ quotes?: Array<{ symbol: string; price: number }> }>
      })
      .then((payload) => {
        const prices = new Map((payload.quotes ?? []).map((q) => [q.symbol.toUpperCase(), q.price]))
        for (const record of due) {
          const currentPrice = prices.get(record.ticker.toUpperCase())
          if (!currentPrice || !record.priceAtRec) continue
          const ageDays = (now - new Date(record.datetime).getTime()) / 86_400_000
          const measuredReturn = ((currentPrice / record.priceAtRec) - 1) * 100
          const nextOutcomes = { ...record.outcomes }
          let changed = false
          for (const [key, days] of horizons) {
            if (ageDays >= days && nextOutcomes[key] === null) {
              nextOutcomes[key] = Number(measuredReturn.toFixed(2)); changed = true
            }
          }
          if (changed) updateRecommendation(record.id, { outcomes: nextOutcomes })
        }
      })
      .catch(() => { measurementRunRef.current = false })
  }, [hydrated, recommendations, updateRecommendation])

  const stats = useMemo(() => {
    const measured = recommendations.filter(isMeasured)
    const correct = measured.filter((r) => callWasCorrect(r) === true)
    const followed = recommendations.filter((r) => FOLLOWED_STATUSES.includes(normalizedStatus(r.executionStatus)))
    const followedMeasured = followed.filter(isMeasured)
    const followedCorrect = followedMeasured.filter((r) => callWasCorrect(r) === true)
    const followedValues = followedMeasured.map(recommendationValue).filter((v): v is number => v !== null)

    const ignored = recommendations.filter((r) => normalizedStatus(r.executionStatus) === "Ignored")
    const ignoredMeasured = ignored.filter(isMeasured)
    const ignoredGood = ignoredMeasured.filter((r) => ignoredDecisionWasGood(r) === true)
    const ignoredBad = ignoredMeasured.filter((r) => ignoredDecisionWasGood(r) === false)

    const missedOpportunities = ignoredMeasured.filter((r) =>
      POSITIVE_CALLS.includes(r.recommendation) && (primaryOutcome(r) ?? 0) > 0
    )
    const avoidedLosses = ignoredMeasured.filter((r) =>
      POSITIVE_CALLS.includes(r.recommendation) && (primaryOutcome(r) ?? 0) < 0
    )
    const missedProtection = ignoredMeasured.filter((r) =>
      NEGATIVE_CALLS.includes(r.recommendation) && (primaryOutcome(r) ?? 0) < 0
    )
    const goodIgnoredWarnings = ignoredMeasured.filter((r) =>
      NEGATIVE_CALLS.includes(r.recommendation) && (primaryOutcome(r) ?? 0) > 0
    )

    const waiting = recommendations.filter((r) =>
      ["Awaiting Decision", "Watching"].includes(normalizedStatus(r.executionStatus))
    )
    const decided = recommendations.filter((r) =>
      !["Awaiting Decision", "Watching"].includes(normalizedStatus(r.executionStatus))
    )

    return {
      total: recommendations.length,
      measured: measured.length,
      fundlyAccuracy: measured.length ? correct.length / measured.length * 100 : 0,
      followed: followed.length,
      followedMeasured: followedMeasured.length,
      followedSuccess: followedMeasured.length ? followedCorrect.length / followedMeasured.length * 100 : 0,
      followedAvgValue: average(followedValues),
      ignored: ignored.length,
      ignoredMeasured: ignoredMeasured.length,
      ignoredGood: ignoredGood.length,
      ignoredBad: ignoredBad.length,
      ignoredDecisionQuality: ignoredMeasured.length ? ignoredGood.length / ignoredMeasured.length * 100 : 0,
      missedOpportunities: missedOpportunities.length,
      avgMissedOpportunity: average(missedOpportunities.map((r) => primaryOutcome(r) ?? 0)),
      avoidedLosses: avoidedLosses.length,
      avgAvoidedLoss: Math.abs(average(avoidedLosses.map((r) => primaryOutcome(r) ?? 0))),
      missedProtection: missedProtection.length,
      avgMissedProtection: Math.abs(average(missedProtection.map((r) => primaryOutcome(r) ?? 0))),
      goodIgnoredWarnings: goodIgnoredWarnings.length,
      waiting: waiting.length,
      decisionRate: recommendations.length ? decided.length / recommendations.length * 100 : 0,
    }
  }, [recommendations])

  const buckets = useMemo(() => [
    { label:"80–100",min:80,max:101 }, { label:"65–79",min:65,max:80 },
    { label:"50–64",min:50,max:65 }, { label:"0–49",min:0,max:50 },
  ].map((d) => {
    const group = recommendations.filter((r) => r.overallScore >= d.min && r.overallScore < d.max)
    const measured = group.filter(isMeasured)
    const correct = measured.filter((r) => callWasCorrect(r) === true).length
    return { ...d, count: group.length, hitRate: measured.length ? correct / measured.length * 100 : null }
  }), [recommendations])

  function openRecord(record: RecommendationRecord) {
    setSelected(record); setNotes(record.executionNotes ?? "")
    setExecutionPrice(record.executionPrice ? String(record.executionPrice) : "")
    setExecutionQuantity(record.executionQuantity ? String(record.executionQuantity) : "")
  }
  function setExecution(status: RecommendationExecutionStatus) {
    if (!selected) return
    const patch = { executionStatus: status, decisionAt: new Date().toISOString() }
    updateRecommendation(selected.id, patch); setSelected({ ...selected, ...patch })
  }
  function saveDecisionDetails() {
    if (!selected) return
    const patch = {
      executionNotes: notes,
      executionPrice: executionPrice ? Number(executionPrice) : null,
      executionQuantity: executionQuantity ? Number(executionQuantity) : null,
      decisionAt: selected.decisionAt ?? new Date().toISOString(),
    }
    updateRecommendation(selected.id, patch); setSelected({ ...selected, ...patch })
  }

  const actionOptions: Array<{status: RecommendationExecutionStatus; label: string; help: string}> = [
    { status:"Executed", label:"Bought / Executed", help:"You acted on the recommendation." },
    { status:"Watching", label:"Watching", help:"You are monitoring it but have not acted." },
    { status:"Ignored", label:"Ignored", help:"You decided not to act." },
    { status:"Already Own", label:"Already Own", help:"The recommendation applies to an existing holding." },
    { status:"Partially Executed", label:"Partially Executed", help:"You acted on only part of the recommendation." },
  ]

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight">Recommendation History</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track every Fundly recommendation, your decision, its sources and the measured market outcome.</p></div>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Recommendations" value={stats.total} sub={`${stats.measured} market outcomes measured`} />
      <StatCard label="Fundly accuracy" value={stats.measured ? fmtPct(stats.fundlyAccuracy,0) : "Pending"} sub="Direction correct across all measured calls" accent={stats.measured && stats.fundlyAccuracy >= 55 ? "positive" : "warning"} />
      <StatCard label="Followed success" value={stats.followedMeasured ? fmtPct(stats.followedSuccess,0) : "Pending"} sub={`${stats.followed} followed · ${stats.followedMeasured} measured`} accent="positive" />
      <StatCard label="Decision rate" value={fmtPct(stats.decisionRate,0)} sub={`${stats.waiting} awaiting or watching`} />
    </div>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Ignored decision quality" value={stats.ignoredMeasured ? fmtPct(stats.ignoredDecisionQuality,0) : "Pending"} sub={`${stats.ignoredGood} good · ${stats.ignoredBad} costly decisions`} accent={stats.ignoredMeasured && stats.ignoredDecisionQuality >= 50 ? "positive" : "warning"} />
      <StatCard label="Missed opportunities" value={stats.missedOpportunities} sub={stats.missedOpportunities ? `Average missed rise ${fmtPct(stats.avgMissedOpportunity,1)}` : "No measured missed gains"} accent="warning" />
      <StatCard label="Losses avoided" value={stats.avoidedLosses} sub={stats.avoidedLosses ? `Average avoided decline ${fmtPct(stats.avgAvoidedLoss,1)}` : "No measured avoided losses"} accent="positive" />
      <StatCard label="Followed recommendation value" value={stats.followedMeasured ? fmtPct(stats.followedAvgValue,1) : "Pending"} sub="Direction-adjusted average outcome" accent={stats.followedAvgValue >= 0 ? "positive" : "warning"} />
    </div>

    <Panel title="How decisions and performance work" description="Fundly measures the recommendation independently from whether you act on it.">
      <div className="grid gap-3 p-4 text-sm text-muted-foreground md:grid-cols-2">
        <p><strong className="text-foreground">Awaiting Decision:</strong> not automatically ignored. Choose Bought, Watching, Ignored or Already Own.</p>
        <p><strong className="text-foreground">Fundly accuracy:</strong> measured for every recommendation after 1 day, 1 week, 1 month and later horizons.</p>
        <p><strong className="text-foreground">Followed performance:</strong> only recommendations marked Executed, Partially Executed or Already Own.</p>
        <p><strong className="text-foreground">Ignored outcomes:</strong> shown as missed opportunities, avoided losses or a good decision to ignore.</p>
      </div>
    </Panel>

    <Panel title="Fundly AI scorecard" description="Separates the quality of Fundly's calls from the investor's decision to follow or ignore them.">
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI calls measured</p>
          <p className="mt-2 text-2xl font-semibold">{stats.measured}</p>
          <p className="mt-1 text-xs text-muted-foreground">Every recommendation is tracked, including ignored calls.</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ignored warnings missed</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--negative)]">{stats.missedProtection}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats.missedProtection ? `Average subsequent decline ${fmtPct(stats.avgMissedProtection,1)}` : "No measured ignored reduce/sell warning has fallen yet."}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Warnings correctly ignored</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--positive)]">{stats.goodIgnoredWarnings}</p>
          <p className="mt-1 text-xs text-muted-foreground">Reduce, sell or avoid calls where the security subsequently rose.</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence status</p>
          <p className="mt-2 text-2xl font-semibold">{stats.measured >= 30 ? "Building" : "Early"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats.measured >= 30 ? "Enough observations for an initial track record; longer horizons still matter." : `${Math.max(0, 30 - stats.measured)} more measured calls before treating the scorecard as meaningful.`}</p>
        </div>
      </div>
      <div className="border-t p-4 text-xs text-muted-foreground">
        These figures are historical measurements of recorded recommendations, not a guarantee of future performance. Selling claims should identify the timeframe, sample size and whether outcomes include ignored calls.
      </div>
    </Panel>

    <Panel title="Confidence calibration" description="Checks whether higher Fundly scores have produced better market outcomes.">
      <div className="space-y-3 p-4">{buckets.map((b)=><div key={b.label} className="flex items-center gap-4">
        <span className="w-24 text-sm">{b.label}</span><span className="w-16 font-mono text-xs text-muted-foreground">{b.count} calls</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{width:`${b.hitRate ?? 0}%`}} /></div>
        <span className="w-14 text-right font-mono text-sm">{b.hitRate===null?"n/a":`${b.hitRate.toFixed(0)}%`}</span>
      </div>)}</div>
    </Panel>

    <Panel title="Recommendation log" description="Click a row to record your decision and inspect rationale, sources and outcomes.">
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground">
        <th className="px-4 py-2">Date</th><th className="px-4 py-2">Ticker</th><th className="px-4 py-2">Recommendation</th><th className="px-4 py-2">Your decision</th><th className="px-4 py-2 text-right">Confidence</th><th className="px-4 py-2 text-right">Outcome</th><th className="px-4 py-2">Result</th>
      </tr></thead><tbody>{recommendations.map((r)=>{
        const out=primaryOutcome(r), status=normalizedStatus(r.executionStatus)
        return <tr key={r.id} onClick={()=>openRecord(r)} className="cursor-pointer border-b hover:bg-muted/50">
          <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(r.datetime)}</td><td className="px-4 py-3 font-mono font-semibold">{r.ticker}</td>
          <td className="px-4 py-3"><RecommendationBadge value={r.recommendation}/></td><td className="px-4 py-3"><Badge variant="outline" className={statusTone(status)}>{status}</Badge></td>
          <td className="px-4 py-3 text-right font-mono">{r.confidence}%</td><td className={`px-4 py-3 text-right font-mono ${outcomeColor(out)}`}>{fmtOutcome(out)}</td>
          <td className="px-4 py-3"><Badge variant="outline">{resultLabel(r)}</Badge></td>
        </tr>
      })}</tbody></table></div>
    </Panel>

    <Dialog open={selected!==null} onOpenChange={(o)=>!o&&setSelected(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">{selected&&<>
      <DialogHeader><DialogTitle className="flex items-center gap-2"><span className="font-mono">{selected.ticker}</span><RecommendationBadge value={selected.recommendation}/><ScorePill score={selected.overallScore}/></DialogTitle>
        <DialogDescription>{fmtDateTime(selected.datetime)} · {selected.sector} · Recommendation price {fmtCurrency(selected.priceAtRec)}</DialogDescription></DialogHeader>

      <div className="rounded-lg border p-4"><h4 className="mb-3 text-sm font-semibold">What did you decide?</h4>
        <div className="grid gap-2 sm:grid-cols-2">{actionOptions.map((option)=>{
          const active=normalizedStatus(selected.executionStatus)===option.status
          return <Button key={option.status} variant={active?"default":"outline"} className="h-auto justify-start py-3 text-left" onClick={()=>setExecution(option.status)}>
            <span><span className="block font-medium">{option.label}</span><span className={`block text-xs ${active?"text-primary-foreground/80":"text-muted-foreground"}`}>{option.help}</span></span>
          </Button>
        })}</div>
        <p className="mt-3 text-xs text-muted-foreground">Leaving this as Awaiting Decision does not count it as ignored.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Confidence</p><p className="text-xl font-semibold">{selected.confidence}%</p></div><div><p className="text-xs text-muted-foreground">Suggested weight</p><p className="text-xl font-semibold">{fmtPct(selected.suggestedWeight)}</p></div><div><p className="text-xs text-muted-foreground">Current status</p><Badge variant="outline" className={statusTone(normalizedStatus(selected.executionStatus))}>{normalizedStatus(selected.executionStatus)}</Badge></div></div>

      {FOLLOWED_STATUSES.includes(normalizedStatus(selected.executionStatus)) && <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <div><label className="mb-1 block text-xs font-medium">Execution price (optional)</label><Input type="number" min="0" step="0.0001" value={executionPrice} onChange={(e)=>setExecutionPrice(e.target.value)} placeholder={String(selected.priceAtRec)} /></div>
        <div><label className="mb-1 block text-xs font-medium">Quantity (optional)</label><Input type="number" min="0" step="0.000001" value={executionQuantity} onChange={(e)=>setExecutionQuantity(e.target.value)} placeholder="Shares or units" /></div>
      </div>}

      <div><h4 className="mb-2 text-sm font-semibold">Why Fundly made this call</h4><ul className="space-y-1 text-sm text-muted-foreground">{selected.reasons.map((x,i)=><li key={i}>+ {x}</li>)}</ul></div>
      <div><h4 className="mb-2 text-sm font-semibold">Confidence contributors</h4><ul className="space-y-1 text-sm text-muted-foreground">{(selected.confidenceContributors??[...selected.reasons.slice(0,3),...selected.risks.slice(0,2)]).map((x,i)=><li key={i}>{x}</li>)}</ul></div>
      <div><h4 className="mb-2 text-sm font-semibold">Sources</h4><div className="flex flex-wrap gap-2">{(selected.sourceNames?.length?selected.sourceNames:["Fundly Decision Engine"]).map(s=><Badge key={s} variant="secondary">{s}</Badge>)}</div></div>
      <div><h4 className="mb-2 text-sm font-semibold">Risks flagged</h4><ul className="space-y-1 text-sm text-muted-foreground">{selected.risks.map((x,i)=><li key={i}>− {x}</li>)}</ul></div>
      <ScenarioView scenarios={selected.scenarios}/>
      <div><h4 className="mb-2 text-sm font-semibold">Decision notes</h4><Textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Why you bought, watched, ignored or already owned this investment..."/><Button className="mt-2" onClick={saveDecisionDetails}>Save decision details</Button></div>
    </>}</DialogContent></Dialog>
  </div>
}
