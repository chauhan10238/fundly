"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, BookOpen, RefreshCw, Sparkles } from "lucide-react"
import { useDios } from "@/components/dios/store"
import { Button } from "@/components/ui/button"
import { fetchLiveAnalysisReport } from "@/lib/dios/live-analysis"
import { buildTacticalOutlook } from "@/lib/dios/tactical-outlook"
import { SCAN_UNIVERSE, getInstrument } from "@/lib/dios/universe"
import type { AnalysisReport, ExternalAnalysisContext, SourceCitation } from "@/lib/dios/types"

type Item = { report: AnalysisReport; context: ExternalAnalysisContext | null }

const PRIORITY_ETFS = [
  "QQQ", "SMH", "SOXX", "VGT", "XLK", "XLE", "VDE", "XLF", "XLV",
  "XLI", "XLP", "XLU", "XLY", "ITA", "PAVE", "GLD", "GDX", "SLV",
  "SCHD", "VIG", "AVUV", "VOO", "VT", "USO",
]
const PRIORITY_STOCKS = ["NVDA", "AMD", "TSM", "GOOG", "MSFT", "META", "AMZN", "AAPL", "JPM", "MU"]

function uniqueSources(items: Item[]) {
  const seen = new Set<string>()
  const result: SourceCitation[] = []
  for (const item of items) for (const source of item.report.sources ?? []) {
    const key = source.url || `${source.name}-${source.date}`
    if (!seen.has(key)) { seen.add(key); result.push(source) }
  }
  return result
}

export default function ScanPage() {
  const { portfolio, settings } = useDios()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updated, setUpdated] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const held = portfolio.positions.map((p) => p.ticker)
      const candidates = [...new Set([...held, ...PRIORITY_ETFS, ...PRIORITY_STOCKS])]
        .filter((ticker) => SCAN_UNIVERSE.includes(ticker) || held.includes(ticker))
        .slice(0, 38)
      const settled = await Promise.allSettled(candidates.map(async (ticker) => {
        const result = await fetchLiveAnalysisReport(ticker, portfolio, settings)
        return { report: result.report, context: result.context }
      }))
      const valid = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : [])
      setItems(valid); setUpdated(new Date().toISOString())
      if (!valid.length) throw new Error("No live scan results were returned.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to run live scan")
    } finally { setLoading(false) }
  }, [portfolio, settings])

  useEffect(() => { void refresh() }, [refresh])

  const heldSet = useMemo(() => new Set(portfolio.positions.map((p) => p.ticker)), [portfolio.positions])
  const ranked = useMemo(() => [...items].sort((a,b) => {
    const ao = buildTacticalOutlook(a.report, a.context)
    const bo = buildTacticalOutlook(b.report, b.context)
    return (b.report.overallScore + bo.high * 3 + bo.confidence * .15) - (a.report.overallScore + ao.high * 3 + ao.confidence * .15)
  }), [items])
  const newEtfs = ranked.filter((item) => item.report.instrumentType === "etf" && !heldSet.has(item.report.ticker)).slice(0,10)
  const holdings = ranked.filter((item) => heldSet.has(item.report.ticker))
  const sources = useMemo(() => uniqueSources(ranked).slice(0,40), [ranked])

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-muted-foreground">DIOS Multi-Source Research</p>
        <h1 className="mt-1 text-2xl font-semibold">Daily Market Scan</h1>
        <p className="mt-1 text-sm text-muted-foreground">Current holdings plus unheld ETFs ranked for the next session and 1–2 trading days.</p>
      </div>
      <Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Run live scan</Button>
    </header>

    <div className="rounded-lg border bg-card px-4 py-3 text-sm">
      <strong>{loading ? "Scanning live providers…" : error ? "Scan completed with an issue" : `Analysed ${items.length} instruments`}</strong>
      <span className="ml-2 text-muted-foreground">{updated ? `Updated ${new Date(updated).toLocaleString()}` : "Waiting for scan"}</span>
      {error ? <div className="mt-2 text-negative">{error}</div> : null}
    </div>

    <section className="rounded-lg border bg-card">
      <div className="border-b px-5 py-4"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary"/><h2 className="font-semibold">Best Unheld ETF Setups</h2></div><p className="mt-1 text-sm text-muted-foreground">Not limited to your portfolio. Ranked using live price, DIOS score, recent news balance and source coverage.</p></div>
      <div className="divide-y">{newEtfs.map((item, index) => <ScanCard key={item.report.ticker} item={item} rank={index+1} />)}{!loading && !newEtfs.length ? <div className="p-6 text-sm text-muted-foreground">No unheld ETF passed the current scan.</div> : null}</div>
    </section>

    <section className="rounded-lg border bg-card">
      <div className="border-b px-5 py-4"><h2 className="font-semibold">Your Holdings: Tomorrow / 1–2 Day Read</h2><p className="mt-1 text-sm text-muted-foreground">Every current holding is included automatically after buys and removed after a full sale.</p></div>
      <div className="divide-y">{holdings.map((item, index) => <ScanCard key={item.report.ticker} item={item} rank={index+1} />)}</div>
    </section>

    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2"><BookOpen className="h-4 w-4"/><h2 className="font-semibold">Sources Actually Used</h2></div>
      <p className="mt-1 text-sm text-muted-foreground">The API may combine Yahoo Finance, the configured live quote provider, Alpha Vantage, Finnhub and SEC EDGAR. Only returned source records appear below.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{sources.map((source) => <a key={source.url || `${source.name}-${source.date}`} href={source.url} target="_blank" rel="noreferrer" className="rounded-md border p-3 hover:bg-muted/40"><div className="text-sm font-medium">{source.name}</div><div className="mt-1 text-xs text-muted-foreground">{source.date} · retrieved {new Date(source.retrieved).toLocaleString()}</div></a>)}</div>
    </section>

    <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><div><strong>Important:</strong> short-horizon ranges are probabilistic model estimates and can be invalidated by overnight news, gaps, macro releases and liquidity. They are research signals, not guaranteed performance or personal financial advice.</div></div></div>
  </div>
}

function ScanCard({ item, rank }: { item: Item; rank: number }) {
  const { report, context } = item
  const outlook = buildTacticalOutlook(report, context)
  const instrument = context?.instrument ?? getInstrument(report.ticker)
  return <div className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex gap-3"><span className="font-mono text-xs text-muted-foreground">#{rank}</span><div><Link href={`/analyse?ticker=${report.ticker}`} className="font-mono text-lg font-semibold hover:underline">{report.ticker}</Link><div className="text-sm text-muted-foreground">{report.name}</div><div className="mt-1 text-xs text-muted-foreground">{instrument?.sector ?? ""}</div></div></div>
      <div className="text-right"><div className="font-semibold">{outlook.direction}</div><div className="font-mono text-sm">{outlook.low >= 0 ? "+" : ""}{outlook.low}% to {outlook.high >= 0 ? "+" : ""}{outlook.high}%</div><div className="text-xs text-muted-foreground">1–2 days · confidence {outlook.confidence}%</div></div>
    </div>
    <div className="mt-3 grid gap-3 md:grid-cols-3"><Mini label="DIOS score" value={`${report.overallScore}/100`} /><Mini label="Recommendation" value={report.recommendation}/><Mini label="Live move" value={`${report.dailyChange >= 0 ? "+" : ""}${report.dailyChange.toFixed(2)}%`}/></div>
    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{[...report.strongestReasons.slice(0,2), ...outlook.evidence.slice(2,4)].map((x) => <li key={x}>• {x}</li>)}</ul>
  </div>
}
function Mini({label,value}:{label:string;value:string}) { return <div className="rounded-md bg-muted/40 p-3"><div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div> }
