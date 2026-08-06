"use client"

import { useMemo, useState } from "react"
import { Activity, AlertTriangle, BookOpenCheck, Calculator, ShieldAlert, Target, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useDios } from "@/components/dios/store"
import { useProfile } from "@/components/dios/profile-provider"
import { ExistingHoldingsTracking } from "@/components/dios/existing-holdings-tracking"
import { trackedRecommendationsForProfile } from "@/lib/dios/tracking"
import { fmtCurrency } from "@/lib/format"
import type { InvestmentJournalEntry, Transaction } from "@/lib/dios/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

function pct(value: number) {
  return `${value.toFixed(1)}%`
}

function buildTaxLots(transactions: Transaction[]) {
  const lots = new Map<string, Array<{ date: string; quantity: number; price: number; fees: number }>>()
  const ordered = [...transactions].sort((a, b) => a.date.localeCompare(b.date))

  for (const tx of ordered) {
    const ticker = tx.ticker.trim().toUpperCase()
    if (!ticker || (tx.type !== "Buy" && tx.type !== "Sell")) continue
    const list = lots.get(ticker) ?? []

    if (tx.type === "Buy") {
      list.push({
        date: tx.date,
        quantity: tx.quantity,
        price: tx.price,
        fees: (tx.brokerageFee ?? 0) + (tx.fxFee ?? 0),
      })
    } else {
      let remaining = tx.quantity
      while (remaining > 0 && list.length) {
        const first = list[0]
        const used = Math.min(first.quantity, remaining)
        first.quantity -= used
        remaining -= used
        if (first.quantity <= 0.000001) list.shift()
      }
    }
    lots.set(ticker, list)
  }

  return Array.from(lots.entries())
    .flatMap(([ticker, entries]) => entries.map((entry) => ({ ticker, ...entry })))
    .filter((lot) => lot.quantity > 0.000001)
    .sort((a, b) => b.quantity * b.price - a.quantity * a.price)
}

export default function InvestorHubPage() {
  const { portfolio, transactions, settings, journal, recommendations, upsertJournalEntry, removeJournalEntry } = useDios()
  const { activeProfile } = useProfile()
  const trackedRecommendations = useMemo(
    () => trackedRecommendationsForProfile(activeProfile?.id, recommendations),
    [activeProfile?.id, recommendations],
  )
  const [marketShock, setMarketShock] = useState(-10)
  const [financialShock, setFinancialShock] = useState(-15)
  const [selectedTicker, setSelectedTicker] = useState(portfolio.positions[0]?.ticker ?? "")

  const currentJournal = journal.find((item) => item.ticker === selectedTicker)
  const [draft, setDraft] = useState<InvestmentJournalEntry>(() => ({
    ticker: selectedTicker,
    thesis: currentJournal?.thesis ?? "",
    targetWeight: currentJournal?.targetWeight ?? 5,
    conviction: currentJournal?.conviction ?? 3,
    reviewDate: currentJournal?.reviewDate ?? "",
    sellRule: currentJournal?.sellRule ?? "",
    notes: currentJournal?.notes ?? "",
    updatedAt: currentJournal?.updatedAt ?? new Date().toISOString(),
  }))

  const concentration = useMemo(() => {
    const sorted = [...portfolio.positions].sort((a, b) => b.weight - a.weight)
    return {
      top5: sorted.slice(0, 5).reduce((sum, position) => sum + position.weight, 0),
      top10: sorted.slice(0, 10).reduce((sum, position) => sum + position.weight, 0),
      largest: sorted[0],
      rows: sorted.slice(0, 15),
    }
  }, [portfolio.positions])

  const scenario = useMemo(() => {
    const broadLoss = portfolio.totalValue * (marketShock / 100)
    const financialValue = portfolio.positions
      .filter((position) => {
        const text = `${position.instrument.sector} ${position.instrument.industry} ${position.instrument.name}`.toLowerCase()
        return /financial|bank|capital one|wells fargo|citigroup|goldman|morgan stanley|jpmorgan/.test(text)
      })
      .reduce((sum, position) => sum + position.marketValue, 0)
    const financialLoss = financialValue * (financialShock / 100)
    return {
      broadLoss,
      broadAfter: portfolio.totalValue + broadLoss,
      financialValue,
      financialLoss,
      combinedAfter: portfolio.totalValue + broadLoss + financialLoss,
    }
  }, [portfolio.positions, portfolio.totalValue, marketShock, financialShock])

  const lots = useMemo(() => buildTaxLots(transactions), [transactions])

  const alerts = useMemo(() => {
    const rows: Array<{ level: "High" | "Medium" | "Info"; title: string; detail: string; source: string; confidence: "High" | "Medium" }> = []
    for (const position of portfolio.positions) {
      if (position.weight > settings.maxStockWeight) {
        rows.push({
          level: "High",
          title: `${position.ticker} concentration`,
          detail: `${position.ticker} is ${pct(position.weight)} of the portfolio, above the ${settings.maxStockWeight}% single-stock limit.`,
          source: "Fundly Portfolio Risk Engine",
          confidence: "High",
        })
      }
      if (position.unrealisedPLPct <= -20) {
        rows.push({
          level: "Medium",
          title: `${position.ticker} deep drawdown`,
          detail: `${position.ticker} is ${pct(position.unrealisedPLPct)} versus cost. Review the thesis before adding capital.`,
          source: "Fundly Portfolio & Cost Basis",
          confidence: "High",
        })
      }
    }
    if (concentration.top5 > 65) {
      rows.unshift({
        level: "High",
        title: "Top-five concentration is elevated",
        detail: `The five largest positions represent ${pct(concentration.top5)} of the portfolio.`,
        source: "Fundly Portfolio Risk Engine",
        confidence: "High",
      })
    }
    if (journal.length < Math.min(10, portfolio.positions.length)) {
      rows.push({
        level: "Info",
        title: "Decision journal incomplete",
        detail: `${journal.length} of ${portfolio.positions.length} positions have a documented thesis. Start with the ten largest holdings.`,
        source: "Fundly Decision Journal",
        confidence: "High",
      })
    }
    return rows.slice(0, 20)
  }, [portfolio.positions, settings.maxStockWeight, concentration.top5, journal.length])

  const health = useMemo(() => {
    let score = 100
    const weaknesses: string[] = []
    const strengths: string[] = []
    if (concentration.top5 > 75) { score -= 30; weaknesses.push("Top-five concentration is very high") }
    else if (concentration.top5 > 60) { score -= 20; weaknesses.push("Top-five concentration is elevated") }
    else strengths.push("Top-five concentration is controlled")
    if (concentration.largest && concentration.largest.weight > settings.maxStockWeight) { score -= 20; weaknesses.push(`${concentration.largest.ticker} exceeds the single-stock limit`) }
    else strengths.push("Largest holding is within the configured limit")
    const journalCoverage = portfolio.positions.length ? journal.length / portfolio.positions.length : 1
    if (journalCoverage < 0.25) { score -= 15; weaknesses.push("Most holdings do not have a documented thesis") }
    else if (journalCoverage >= 0.75) strengths.push("Decision-journal coverage is strong")
    const deepDrawdowns = portfolio.positions.filter((p) => p.unrealisedPLPct <= -20).length
    if (deepDrawdowns) { score -= Math.min(15, deepDrawdowns * 3); weaknesses.push(`${deepDrawdowns} holdings are down more than 20% from cost`) }
    else strengths.push("No holdings are in a deep cost-basis drawdown")
    return { score: Math.max(0, Math.round(score)), strengths: strengths.slice(0, 3), weaknesses: weaknesses.slice(0, 4) }
  }, [concentration, journal.length, portfolio.positions, settings.maxStockWeight])

  const recommendationPerformance = useMemo(() => {
    const outcomeFor = (r: (typeof trackedRecommendations)[number]) =>
      r.outcomes.m12 ?? r.outcomes.m6 ?? r.outcomes.m3 ?? r.outcomes.m1 ?? r.outcomes.w1 ?? r.outcomes.d1
    const positiveCalls = ["Strong Buy", "Buy", "Start Small", "Buy Watch"]
    const negativeCalls = ["Sell", "Avoid", "Reduce"]
    const isCorrect = (r: (typeof trackedRecommendations)[number]) => {
      const outcome = outcomeFor(r)
      if (outcome === null) return false
      return positiveCalls.includes(r.recommendation)
        ? outcome > 0
        : negativeCalls.includes(r.recommendation)
          ? outcome < 0
          : Math.abs(outcome) < 5
    }
    const ignoredWasGood = (r: (typeof trackedRecommendations)[number]) => {
      const outcome = outcomeFor(r)
      if (outcome === null) return false
      return positiveCalls.includes(r.recommendation)
        ? outcome <= 0
        : negativeCalls.includes(r.recommendation)
          ? outcome >= 0
          : Math.abs(outcome) >= 5
    }

    const measured = trackedRecommendations.filter((r) => outcomeFor(r) !== null)
    const followedStatuses = ["Executed", "Partially Executed", "Already Own"]
    const followed = trackedRecommendations.filter((r) => followedStatuses.includes(r.executionStatus ?? ""))
    const followedMeasured = followed.filter((r) => outcomeFor(r) !== null)
    const ignored = trackedRecommendations.filter((r) => r.executionStatus === "Ignored")
    const ignoredMeasured = ignored.filter((r) => outcomeFor(r) !== null)
    const correct = measured.filter(isCorrect).length
    const ignoredGood = ignoredMeasured.filter(ignoredWasGood).length

    return {
      total: trackedRecommendations.length,
      measured: measured.length,
      successRate: measured.length ? correct / measured.length * 100 : 0,
      followed: followed.length,
      followedMeasured: followedMeasured.length,
      followedSuccessRate: followedMeasured.length ? followedMeasured.filter(isCorrect).length / followedMeasured.length * 100 : 0,
      ignored: ignored.length,
      ignoredMeasured: ignoredMeasured.length,
      ignoredDecisionQuality: ignoredMeasured.length ? ignoredGood / ignoredMeasured.length * 100 : 0,
    }
  }, [trackedRecommendations])

  function selectTicker(ticker: string) {
    setSelectedTicker(ticker)
    const entry = journal.find((item) => item.ticker === ticker)
    setDraft({
      ticker,
      thesis: entry?.thesis ?? "",
      targetWeight: entry?.targetWeight ?? 5,
      conviction: entry?.conviction ?? 3,
      reviewDate: entry?.reviewDate ?? "",
      sellRule: entry?.sellRule ?? "",
      notes: entry?.notes ?? "",
      updatedAt: entry?.updatedAt ?? new Date().toISOString(),
    })
  }

  function saveJournal() {
    if (!draft.ticker || !draft.thesis.trim()) {
      toast.error("Add an investment thesis before saving.")
      return
    }
    upsertJournalEntry({ ...draft, ticker: draft.ticker.trim().toUpperCase() })
    toast.success(`${draft.ticker} journal saved`)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{activeProfile?.name ?? "Investor"} · portfolio governance</p>
        <h1 className="text-2xl font-semibold tracking-tight">Investor Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Concentration, stress testing, tax lots, decision discipline and material alerts for a high-value portfolio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Top 5 concentration</CardDescription><CardTitle>{pct(concentration.top5)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Top 10 concentration</CardDescription><CardTitle>{pct(concentration.top10)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Open tax lots</CardDescription><CardTitle>{lots.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Documented theses</CardDescription><CardTitle>{journal.length} / {portfolio.positions.length}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardDescription>Portfolio Health Score</CardDescription><CardTitle className="text-4xl">{health.score} / 100</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><p className="mb-2 text-sm font-medium">Strengths</p>{health.strengths.length ? health.strengths.map((item)=><p key={item} className="text-sm text-muted-foreground">✓ {item}</p>) : <p className="text-sm text-muted-foreground">No material strengths scored yet.</p>}</div>
            <div><p className="mb-2 text-sm font-medium">Weaknesses</p>{health.weaknesses.length ? health.weaknesses.map((item)=><p key={item} className="text-sm text-muted-foreground">✕ {item}</p>) : <p className="text-sm text-muted-foreground">No material weaknesses detected.</p>}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Fundly Recommendation Performance</CardDescription><CardTitle>{recommendationPerformance.measured ? `${recommendationPerformance.successRate.toFixed(1)}% success rate` : "Waiting for measured outcomes"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
            <div><p className="text-muted-foreground">Logged / measured</p><p className="text-xl font-semibold">{recommendationPerformance.total} / {recommendationPerformance.measured}</p></div>
            <div><p className="text-muted-foreground">Followed</p><p className="text-xl font-semibold">{recommendationPerformance.followed}</p></div>
            <div><p className="text-muted-foreground">Followed success</p><p className="text-xl font-semibold text-[var(--positive)]">{recommendationPerformance.followedMeasured ? `${recommendationPerformance.followedSuccessRate.toFixed(1)}%` : "Pending"}</p></div>
            <div><p className="text-muted-foreground">Ignored</p><p className="text-xl font-semibold">{recommendationPerformance.ignored}</p></div>
            <div><p className="text-muted-foreground">Ignored decision quality</p><p className="text-xl font-semibold">{recommendationPerformance.ignoredMeasured ? `${recommendationPerformance.ignoredDecisionQuality.toFixed(1)}%` : "Pending"}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={activeProfile?.id === "suren" ? "baseline" : "risk"} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {activeProfile?.id === "suren" && <TabsTrigger value="baseline"><Activity className="mr-2 h-4 w-4" />Since 5 Aug</TabsTrigger>}
          <TabsTrigger value="risk"><ShieldAlert className="mr-2 h-4 w-4" />Concentration</TabsTrigger>
          <TabsTrigger value="stress"><Calculator className="mr-2 h-4 w-4" />Stress test</TabsTrigger>
          <TabsTrigger value="lots"><Target className="mr-2 h-4 w-4" />Tax lots</TabsTrigger>
          <TabsTrigger value="journal"><BookOpenCheck className="mr-2 h-4 w-4" />Decision journal</TabsTrigger>
          <TabsTrigger value="alerts"><AlertTriangle className="mr-2 h-4 w-4" />Alerts</TabsTrigger>
        </TabsList>

        {activeProfile?.id === "suren" && <TabsContent value="baseline">
          <ExistingHoldingsTracking />
        </TabsContent>}

        <TabsContent value="risk">
          <Card>
            <CardHeader><CardTitle>Largest positions</CardTitle><CardDescription>Single-stock exposure compared with the configured limit of {settings.maxStockWeight}%.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {concentration.rows.map((position) => (
                <div key={position.ticker} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div><span className="font-semibold">{position.ticker}</span><span className="ml-2 text-muted-foreground">{position.instrument.name}</span></div>
                    <div className="text-right"><span className="font-medium">{pct(position.weight)}</span><span className="ml-3 text-muted-foreground">{fmtCurrency(position.marketValue)}</span></div>
                  </div>
                  <Progress value={Math.min(position.weight, 100)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stress">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Scenario assumptions</CardTitle><CardDescription>Adjust the shocks to estimate portfolio sensitivity. This is not a forecast.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2"><Label>Broad market shock (%)</Label><Input type="number" value={marketShock} onChange={(e) => setMarketShock(Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>Additional financial-sector shock (%)</Label><Input type="number" value={financialShock} onChange={(e) => setFinancialShock(Number(e.target.value))} /></div>
                <p className="text-xs text-muted-foreground">Financial exposure is estimated from available sector, industry and company metadata. Unclassified securities can understate this result.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Estimated impact</CardTitle><CardDescription>Simple linear shock analysis using current market values.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><span>Broad-market impact</span><span className="font-semibold text-negative">{fmtCurrency(scenario.broadLoss)}</span></div>
                <div className="flex justify-between"><span>Estimated financial exposure</span><span className="font-semibold">{fmtCurrency(scenario.financialValue)}</span></div>
                <div className="flex justify-between"><span>Additional financial impact</span><span className="font-semibold text-negative">{fmtCurrency(scenario.financialLoss)}</span></div>
                <div className="border-t pt-4"><div className="flex justify-between text-lg"><span>Portfolio after combined shock</span><span className="font-semibold">{fmtCurrency(scenario.combinedAfter)}</span></div></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lots">
          <Card>
            <CardHeader><CardTitle>FIFO tax-lot view</CardTitle><CardDescription>Derived from recorded buy and sell transactions. Confirm with Schwab and a tax adviser before relying on it for reporting.</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Ticker</th><th>Date</th><th>Quantity</th><th>Cost/share</th><th>Fees</th><th>Open cost basis</th></tr></thead>
                  <tbody>{lots.slice(0, 200).map((lot, index) => (
                    <tr key={`${lot.ticker}-${lot.date}-${index}`} className="border-b">
                      <td className="py-2 font-semibold">{lot.ticker}</td><td>{lot.date}</td><td>{lot.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td><td>{fmtCurrency(lot.price)}</td><td>{fmtCurrency(lot.fees)}</td><td>{fmtCurrency(lot.quantity * lot.price + lot.fees)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <Card>
              <CardHeader><CardTitle>Holdings</CardTitle><CardDescription>Select a position to document.</CardDescription></CardHeader>
              <CardContent className="max-h-[650px] space-y-1 overflow-y-auto">
                {[...portfolio.positions].sort((a, b) => b.weight - a.weight).map((position) => (
                  <button key={position.ticker} onClick={() => selectTicker(position.ticker)} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selectedTicker === position.ticker ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    <span className="font-medium">{position.ticker}</span><span>{pct(position.weight)}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{selectedTicker || "Select a holding"} decision journal</CardTitle><CardDescription>Record the reason to own it, target exposure and conditions that would change the decision.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Investment thesis</Label><Textarea rows={4} value={draft.thesis} onChange={(e) => setDraft((d) => ({ ...d, thesis: e.target.value }))} /></div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2"><Label>Target weight (%)</Label><Input type="number" min="0" max="100" value={draft.targetWeight} onChange={(e) => setDraft((d) => ({ ...d, targetWeight: Number(e.target.value) }))} /></div>
                  <div className="space-y-2"><Label>Conviction</Label><Select value={String(draft.conviction)} onValueChange={(value) => setDraft((d) => ({ ...d, conviction: Number(value) as 1 | 2 | 3 | 4 | 5 }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map((value) => <SelectItem key={value} value={String(value)}>{value} / 5</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Review date</Label><Input type="date" value={draft.reviewDate} onChange={(e) => setDraft((d) => ({ ...d, reviewDate: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Sell / reduce rule</Label><Textarea rows={3} value={draft.sellRule} onChange={(e) => setDraft((d) => ({ ...d, sellRule: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} /></div>
                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline" disabled={!currentJournal} onClick={() => { removeJournalEntry(selectedTicker); toast.success(`${selectedTicker} journal removed`) }}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>
                  <Button onClick={saveJournal}>Save journal</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader><CardTitle>Material portfolio alerts</CardTitle><CardDescription>Rules-based alerts prioritised for concentration, drawdowns and governance.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No material alerts.</p> : alerts.map((alert, index) => (
                <div key={`${alert.title}-${index}`} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{alert.title}</p><p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline">Source: {alert.source}</Badge><Badge variant="outline">Confidence: {alert.confidence}</Badge></div></div><Badge variant={alert.level === "High" ? "destructive" : "secondary"}>{alert.level}</Badge></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
