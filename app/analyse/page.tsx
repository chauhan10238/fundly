"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookmarkPlus, Check, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useDios } from "@/components/dios/store"
import { analyse } from "@/lib/dios/analyse"
import { TickerSearch } from "@/components/dios/ticker-search"
import { AnalysisReportView } from "@/components/dios/analysis-report"
import { Panel } from "@/components/dios/ui-bits"
import { Button } from "@/components/ui/button"
import type { AnalysisReport, ExternalAnalysisContext, MarketSnapshot, RecommendationRecord } from "@/lib/dios/types"
import { MACRO } from "@/lib/dios/macro"
import { getInstrument } from "@/lib/dios/universe"

const SUGGESTIONS = ["NVDA", "GLD", "VOO", "INTC", "SMH", "TSM", "QQQ", "SCHD"]

function AnalyseInner() {
  const router = useRouter()
  const params = useSearchParams()
  const ticker = params.get("ticker")?.toUpperCase() ?? ""
  const { portfolio, settings, addRecommendation, recommendations } = useDios()
  const [logged, setLogged] = useState(false)
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [externalContext, setExternalContext] = useState<ExternalAnalysisContext | null>(null)
  const [loadingMarket, setLoadingMarket] = useState(false)

  const loadMarket = useCallback(async () => {
    if (!ticker) return
    setLoadingMarket(true)
    setMarketError(null)
    try {
      const response = await fetch(`/api/analysis?ticker=${encodeURIComponent(ticker)}`, { cache: "no-store" })
      const payload = await response.json() as { snapshot?: MarketSnapshot; context?: ExternalAnalysisContext; error?: string; warning?: string }
      if (!response.ok || !payload.snapshot) throw new Error(payload.error || `Analysis request failed (${response.status})`)
      setMarket(payload.snapshot)
      setExternalContext(payload.context ?? null)
      setMarketError(payload.warning ?? (payload.context?.warnings?.length ? payload.context.warnings.join(" ") : null))
    } catch (error) {
      setMarket(null)
      setExternalContext(null)
      setMarketError(error instanceof Error ? error.message : "Unable to retrieve market data")
    } finally {
      setLoadingMarket(false)
    }
  }, [ticker])

  useEffect(() => {
    void loadMarket()
  }, [loadMarket])

  const result = useMemo(() => {
    if (!ticker) return null
    return analyse(ticker, portfolio, settings, market ?? undefined, externalContext ?? undefined)
  }, [ticker, portfolio, settings, market, externalContext])

  useEffect(() => {
    setLogged(false)
  }, [ticker])

  const select = useCallback(
    (t: string) => {
      router.push(`/analyse?ticker=${t}`)
    },
    [router],
  )

  const report = result && !("error" in result) ? (result as AnalysisReport) : null

  const logRecommendation = useCallback(() => {
    if (!report) return
    const inst = getInstrument(report.ticker)
    const record: RecommendationRecord = {
      id: `rec-${Date.now()}`,
      datetime: new Date().toISOString(),
      ticker: report.ticker,
      type: report.instrumentType,
      priceAtRec: report.price,
      overallScore: report.overallScore,
      recommendation: report.recommendation,
      suggestedWeight: report.proposedWeight,
      confidence: report.confidence,
      reasons: report.whyToday,
      risks: report.thesisInvalidation,
      scenarios: report.scenarios,
      modelVersion: report.modelVersion,
      scoringVersion: report.scoringVersion,
      sector: inst?.sector ?? "—",
      macroRegime: MACRO.regime,
      outcomes: { d1: null, w1: null, m1: null, m3: null, m6: null, m12: null },
    }
    addRecommendation(record)
    setLogged(true)
    toast.success(`Logged ${report.recommendation} for ${report.ticker}`, {
      description: "Saved to recommendation history for outcome tracking.",
    })
  }, [report, addRecommendation])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Analyse an Instrument</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Institutional-style, fully-sourced decision report scored across twelve factors and mapped to your portfolio.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <TickerSearch onSelect={select} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Quick pick:</span>
          {SUGGESTIONS.map((t) => (
            <button
              key={t}
              onClick={() => select(t)}
              className="rounded-md border border-border bg-card px-2 py-1 font-mono text-xs font-medium transition-colors hover:bg-muted"
            >
              {t}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{recommendations.length} recommendations logged</span>
        </div>
      </div>

      {ticker && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            {loadingMarket && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>
              {loadingMarket
                ? `Retrieving current market data for ${ticker}…`
                : market?.isLive
                  ? `Live price connected via ${market.provider}`
                  : marketError || "DIOS model fallback price in use"}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void loadMarket()} disabled={loadingMarket}>
            <RefreshCw className={`h-3.5 w-3.5 ${loadingMarket ? "animate-spin" : ""}`} />
            Refresh analysis
          </Button>
        </div>
      )}

      {result && "error" in result && (
        <Panel title="Not found">
          <p className="p-4 text-sm text-muted-foreground">{result.error}</p>
        </Panel>
      )}

      {report && (
        <>
          <div className="flex justify-end">
            <Button onClick={logRecommendation} disabled={logged} variant={logged ? "outline" : "default"}>
              {logged ? <Check className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
              {logged ? "Logged to history" : "Log recommendation"}
            </Button>
          </div>
          <AnalysisReportView report={report} weights={settings.weights} />
        </>
      )}

      {!result && (
        <Panel title="Start an analysis" description="Search for any instrument in the tracked universe above.">
          <p className="p-4 text-sm text-muted-foreground text-pretty">
            DIOS scores each instrument across macro, geopolitics, earnings, fundamentals, valuation, quality, flows,
            technicals, portfolio fit, timing, psychology and opportunity cost — then explains why to act (or wait),
            models bull/base/bear scenarios, and maps the position against your current holdings.
          </p>
        </Panel>
      )}
    </div>
  )
}

export default function AnalysePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <AnalyseInner />
    </Suspense>
  )
}
