"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, RefreshCw, Sparkles } from "lucide-react"
import { useDios } from "@/components/dios/store"
import { Button } from "@/components/ui/button"
import { Panel, StatCard } from "@/components/dios/ui-bits"
import { fetchLiveAnalysisReport, type LiveAnalysisResult } from "@/lib/dios/live-analysis"
import { buildIntelligenceView, getSourceFamilies, rankOpportunity } from "@/lib/dios/intelligence-view"

const ETF_UNIVERSE = [
  "VOO", "QQQ", "VTI", "VT", "DIA", "IWM", "SCHD", "VIG", "VUG", "VTV",
  "QUAL", "USMV", "AVUV", "SMH", "SOXX", "VGT", "XLK", "CIBR", "BOTZ", "ARKQ",
  "XLE", "VDE", "XLF", "XLV", "XLI", "XLP", "XLU", "ITA", "PAVE", "VNQ",
  "GLD", "SLV", "GDX", "COPX", "URA", "TLT", "IEF", "HYG", "LQD", "EFA",
  "EEM", "INDA", "EWJ", "VGK", "IBIT",
]

type MarketItem = {
  symbol: string
  label: string
  price: number
  previousClose: number
  changePercent: number
  provider: string
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(values.length)
  let cursor = 0
  async function run() {
    while (cursor < values.length) {
      const index = cursor++
      results[index] = await worker(values[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, run))
  return results
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

function tone(value: string) {
  if (value === "Bullish") return "text-positive bg-positive/10"
  if (value === "Bearish") return "text-negative bg-negative/10"
  return "text-muted-foreground bg-muted"
}

export default function DailyBriefPage() {
  const { portfolio, settings, hydrated } = useDios()
  const [market, setMarket] = useState<MarketItem[]>([])
  const [holdingResults, setHoldingResults] = useState<LiveAnalysisResult[]>([])
  const [opportunityResults, setOpportunityResults] = useState<LiveAnalysisResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const heldSet = useMemo(
    () => new Set(portfolio.positions.map((position) => position.ticker)),
    [portfolio.positions],
  )

  const refresh = useCallback(async () => {
    if (!hydrated) return
    setLoading(true)
    setError(null)

    try {
      const marketPromise = fetch("/api/market-overview", { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json()
          if (!response.ok) throw new Error(payload.error || "Market overview failed")
          return Array.isArray(payload.items) ? payload.items as MarketItem[] : []
        })
        .catch(() => [] as MarketItem[])

      const holdingTickers = portfolio.positions.map((position) => position.ticker)
      const discovery = ETF_UNIVERSE.filter((ticker) => !heldSet.has(ticker)).slice(0, 30)

      const [marketRows, holdings, candidates] = await Promise.all([
        marketPromise,
        mapWithConcurrency(holdingTickers, 5, (ticker) =>
          fetchLiveAnalysisReport(ticker, portfolio, settings),
        ),
        mapWithConcurrency(discovery, 5, (ticker) =>
          fetchLiveAnalysisReport(ticker, portfolio, settings),
        ),
      ])

      setMarket(marketRows)
      setHoldingResults(holdings)
      setOpportunityResults(
        candidates.sort((a, b) => rankOpportunity(b) - rankOpportunity(a)).slice(0, 10),
      )
      setGeneratedAt(new Date().toISOString())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to build the Daily Brief")
    } finally {
      setLoading(false)
    }
  }, [heldSet, hydrated, portfolio, settings])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const sourceFamilies = useMemo(() => {
    const sources = new Set<string>()
    for (const result of [...holdingResults, ...opportunityResults]) {
      getSourceFamilies(result).forEach((source) => sources.add(source))
    }
    market.forEach((item) => sources.add(item.provider))
    return [...sources]
  }, [holdingResults, opportunityResults, market])

  const holdingViews = holdingResults.map((result) => ({
    result,
    view: buildIntelligenceView(result),
  }))
  const opportunityViews = opportunityResults.map((result) => ({
    result,
    view: buildIntelligenceView(result),
  }))

  const averageScore = holdingResults.length
    ? Math.round(holdingResults.reduce((sum, item) => sum + item.report.overallScore, 0) / holdingResults.length)
    : 50
  const averageQuality = holdingViews.length
    ? Math.round(holdingViews.reduce((sum, item) => sum + item.view.dataQuality, 0) / holdingViews.length)
    : 0
  const largestWeight = portfolio.largestPosition?.weight ?? 0
  const diversification = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, largestWeight - 15) * 2.5)))
  const highRiskCount = holdingResults.filter((item) => item.report.recommendation === "Reduce" || item.report.recommendation === "Sell" || item.report.recommendation === "Avoid").length
  const riskScore = Math.min(100, Math.round(25 + highRiskCount * 15 + Math.max(0, largestWeight - 20)))
  const healthScore = Math.round(averageScore * 0.55 + averageQuality * 0.2 + diversification * 0.15 + (100 - riskScore) * 0.1)

  const sp = market.find((item) => item.symbol === "^GSPC")
  const nasdaq = market.find((item) => item.symbol === "^IXIC")
  const marketSummary = market.length
    ? `S&P 500 ${sp ? signed(sp.changePercent) : "unavailable"}; Nasdaq ${nasdaq ? signed(nasdaq.changePercent) : "unavailable"}.`
    : "Market overview unavailable; holdings analysis is still shown from the shared live engine."

  const risks = [
    ...portfolio.warnings.slice(0, 3).map((warning) => warning.detail),
    ...holdingViews
      .filter(({ view }) => view.outlook === "Bearish")
      .slice(0, 3)
      .map(({ result }) => `${result.report.ticker}: ${result.report.mainRisk}`),
  ]
  if (!risks.length) risks.push("No critical portfolio risk gate is currently triggered.")

  const actions = holdingViews.slice(0, 8).map(({ result, view }) => {
    if (view.outlook === "Bullish" && result.report.overallScore >= 70) return `Hold/add watch: ${result.report.ticker}; use staged entries rather than chasing.`
    if (view.outlook === "Bearish") return `Review ${result.report.ticker}; avoid adding until trend and timing improve.`
    return `Hold ${result.report.ticker}; no clear short-term edge.`
  })
  if (opportunityViews[0]) actions.push(`Top unheld ETF watch: ${opportunityViews[0].result.report.ticker} (${opportunityViews[0].result.report.overallScore}/100).`)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Daily Intelligence Brief</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            One shared intelligence engine for holdings, market outlook and ranked ETF opportunities.
          </p>
        </div>
        <Button onClick={() => void refresh()} disabled={loading || !hydrated}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Building brief…" : "Refresh brief"}
        </Button>
      </div>

      {error && <div className="rounded-lg border border-negative/40 bg-negative/10 p-4 text-sm text-negative">{error}</div>}

      <div className={`rounded-lg border p-4 ${holdingResults.length ? "border-positive/30 bg-positive/5" : "border-warning/40 bg-warning/10"}`}>
        <div className="font-medium">{holdingResults.length ? "Live shared-engine brief" : "Building live brief"}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {generatedAt ? `Generated ${new Date(generatedAt).toLocaleString()}` : "Waiting for portfolio hydration"} · Sources: {sourceFamilies.join(", ") || "loading"}
        </div>
      </div>

      <Panel title="Overnight Market" description={marketSummary}>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {market.map((item) => (
            <div key={item.symbol} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-1 font-mono text-lg font-semibold">{item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <div className={item.changePercent >= 0 ? "text-sm text-positive" : "text-sm text-negative"}>{signed(item.changePercent)}</div>
            </div>
          ))}
          {!market.length && <div className="col-span-full text-sm text-muted-foreground">Market feed did not return data. This no longer blocks portfolio analysis.</div>}
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Portfolio Health" value={`${healthScore}/100`} detail="Score, quality and risk" />
        <StatCard label="Average Data Quality" value={`${averageQuality}%`} detail="Separate from direction" />
        <StatCard label="Diversification" value={`${diversification}/100`} detail="Position concentration" />
        <StatCard label="Risk Score" value={`${riskScore}/100`} detail="Higher means more risk" />
      </div>

      <Panel title="Holdings Intelligence" description="Every holding receives Bullish, Neutral or Bearish; data quality is shown separately.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr><th className="p-3">Ticker</th><th className="p-3 text-right">Score</th><th className="p-3">1–2 Day</th><th className="p-3 text-right">Probability</th><th className="p-3 text-right">Data Quality</th><th className="p-3">Action</th><th className="p-3">Main Driver</th></tr>
            </thead>
            <tbody>
              {holdingViews.map(({ result, view }) => (
                <tr key={result.report.ticker} className="border-b border-border/70">
                  <td className="p-3"><Link href={`/analyse?ticker=${result.report.ticker}`} className="font-mono font-semibold text-primary">{result.report.ticker}</Link></td>
                  <td className="p-3 text-right font-mono font-semibold">{result.report.overallScore}</td>
                  <td className="p-3"><span className={`rounded px-2 py-1 text-xs ${tone(view.outlook)}`}>{view.label}</span></td>
                  <td className="p-3 text-right">{view.probability}%</td>
                  <td className="p-3 text-right"><div>{view.dataQuality}%</div><div className="text-[10px] text-muted-foreground">{view.availableSignals}/{view.totalSignals} checks</div></td>
                  <td className="p-3">{result.report.recommendation}</td>
                  <td className="max-w-sm p-3 text-muted-foreground">{result.report.whyToday[0] || result.report.strongestReasons[0] || "Composite model"}</td>
                </tr>
              ))}
              {!loading && !holdingViews.length && <tr><td colSpan={7} className="p-4 text-muted-foreground">No portfolio holdings were available after cloud hydration.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Top Ranked Unheld ETF Opportunities" description="The best available ETFs are always shown; Neutral entries are watchlist candidates, not automatic buys.">
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
          {opportunityViews.map(({ result, view }, index) => (
            <div key={result.report.ticker} className="rounded-lg border p-4">
              <div className="flex items-center justify-between"><Link href={`/analyse?ticker=${result.report.ticker}`} className="font-mono text-lg font-semibold text-primary">{result.report.ticker}</Link><span className="text-xs text-muted-foreground">#{index + 1}</span></div>
              <div className="mt-3 text-3xl font-semibold">{result.report.overallScore}</div>
              <div className={`mt-2 inline-block rounded px-2 py-1 text-xs ${tone(view.outlook)}`}>{view.label}</div>
              <div className="mt-2 text-xs">Probability {view.probability}% · Quality {view.dataQuality}%</div>
              <div className="mt-3 text-xs text-muted-foreground">{result.report.whyToday[0] || result.report.strongestReasons[0] || "Composite ranking"}</div>
            </div>
          ))}
          {!loading && !opportunityViews.length && <div className="col-span-full text-sm text-muted-foreground">ETF providers did not return candidates. Refresh after checking provider status.</div>}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Portfolio Risks"><div className="space-y-3 p-4">{risks.map((risk) => <div key={risk} className="flex gap-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" /><span>{risk}</span></div>)}</div></Panel>
        <Panel title="Today's Actions"><div className="space-y-3 p-4">{actions.map((action) => <div key={action} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" /><span>{action}</span></div>)}</div></Panel>
      </div>
    </div>
  )
}
