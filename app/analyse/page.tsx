"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookmarkPlus, BrainCircuit, Check, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useDios } from "@/components/dios/store"
import { analyse } from "@/lib/dios/analyse"
import { TickerSearch } from "@/components/dios/ticker-search"
import { AnalysisReportView } from "@/components/dios/analysis-report"
import { InstitutionalIntelligenceView } from "@/components/dios/institutional-intelligence"
import { AnalysisReportActions } from "@/components/dios/analysis-report-actions"\nimport { StockPriceChart } from "@/components/dios/stock-price-chart"
import { Panel } from "@/components/dios/ui-bits"
import { Button } from "@/components/ui/button"
import type {
  AnalysisReport,
  ExternalAnalysisContext,
  MarketSnapshot,
  RecommendationRecord,
} from "@/lib/dios/types"
import type { InstitutionalCompanyIntelligence } from "@/lib/data-providers"
import { MACRO } from "@/lib/dios/macro"
import { getInstrument } from "@/lib/dios/universe"

const SUGGESTIONS = ["NVDA", "AAPL", "GOOG", "GLD", "VOO", "TSM", "QQQ", "SCHD"]

function AnalyseInner() {
  const router = useRouter()
  const params = useSearchParams()
  const ticker = params.get("ticker")?.toUpperCase() ?? ""
  const { portfolio, settings, addRecommendation, recommendations } = useDios()

  const [logged, setLogged] = useState(false)
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [externalContext, setExternalContext] =
    useState<ExternalAnalysisContext | null>(null)
  const [intelligence, setIntelligence] =
    useState<InstitutionalCompanyIntelligence | null>(null)
  const [loadingMarket, setLoadingMarket] = useState(false)
  const [runningAnalysis, setRunningAnalysis] = useState(false)
  const [analysisVersion, setAnalysisVersion] = useState(0)

  const loadMarket = useCallback(async (): Promise<boolean> => {
    if (!ticker) return false

    setLoadingMarket(true)
    setMarketError(null)

    try {
      const response = await fetch(
        `/api/analysis?ticker=${encodeURIComponent(ticker)}`,
        { cache: "no-store" },
      )

      const payload = (await response.json()) as {
        snapshot?: MarketSnapshot
        context?: ExternalAnalysisContext
        intelligence?: InstitutionalCompanyIntelligence
        error?: string
        warning?: string
      }

      if (!response.ok || !payload.snapshot) {
        throw new Error(
          payload.error || `Analysis request failed (${response.status})`,
        )
      }

      setMarket(payload.snapshot)
      setExternalContext(payload.context ?? null)
      setIntelligence(payload.intelligence ?? null)

      setMarketError(
        payload.warning ??
          (payload.context?.warnings?.length
            ? payload.context.warnings.join(" ")
            : null),
      )

      return true
    } catch (error) {
      setMarket(null)
      setExternalContext(null)
      setIntelligence(null)
      setMarketError(
        error instanceof Error
          ? error.message
          : "Unable to retrieve market data",
      )

      return false
    } finally {
      setLoadingMarket(false)
    }
  }, [ticker])

  const runDiosAnalysis = useCallback(async () => {
    if (!ticker || runningAnalysis) return

    setRunningAnalysis(true)

    try {
      const success = await loadMarket()

      if (!success) {
        toast.error(`Unable to run DIOS analysis for ${ticker}`)
        return
      }

      setAnalysisVersion((version) => version + 1)
      setLogged(false)

      toast.success(`DIOS analysis completed for ${ticker}`, {
        description:
          "Market data, institutional intelligence, portfolio impact and decision score have been refreshed.",
      })
    } finally {
      setRunningAnalysis(false)
    }
  }, [ticker, runningAnalysis, loadMarket])

  useEffect(() => {
    void loadMarket()
  }, [loadMarket])

  const result = useMemo(() => {
    if (!ticker) return null

    return analyse(
      ticker,
      portfolio,
      settings,
      market ?? undefined,
      externalContext ?? undefined,
    )
  }, [ticker, portfolio, settings, market, externalContext, analysisVersion])

  useEffect(() => {
    setLogged(false)
  }, [ticker])

  const select = useCallback(
    (value: string) => {
      router.push(`/analyse?ticker=${value}`)
    },
    [router],
  )

  const report =
    result && !("error" in result) ? (result as AnalysisReport) : null

  const logRecommendation = useCallback(() => {
    if (!report) return

    const instrument = getInstrument(report.ticker)

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
      sector:
        externalContext?.instrument?.sector ?? instrument?.sector ?? "—",
      macroRegime: MACRO.regime,
      outcomes: {
        d1: null,
        w1: null,
        m1: null,
        m3: null,
        m6: null,
        m12: null,
      },
    }

    addRecommendation(record)
    setLogged(true)

    toast.success(`Logged ${report.recommendation} for ${report.ticker}`, {
      description: "Saved to recommendation history for outcome tracking.",
    })
  }, [report, addRecommendation, externalContext])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Analyse an Instrument
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Multi-source company intelligence, financial health and a
          portfolio-aware DIOS decision report.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <TickerSearch onSelect={select} />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Quick pick:</span>

          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => select(suggestion)}
              className="rounded-md border border-border bg-card px-2 py-1 font-mono text-xs font-medium transition-colors hover:bg-muted"
            >
              {suggestion}
            </button>
          ))}

          <span className="ml-auto text-xs text-muted-foreground">
            {recommendations.length} recommendations logged
          </span>
        </div>
      </div>

      {ticker && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            {loadingMarket && <Loader2 className="h-3.5 w-3.5 animate-spin" />}

            <span>
              {loadingMarket
                ? `Building multi-source analysis for ${ticker}…`
                : market?.isLive
                  ? `Live price via ${market.provider}; institutional intelligence ${
                      intelligence ? "connected" : "limited"
                    }`
                  : marketError || "DIOS model fallback price in use"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadMarket()}
              disabled={loadingMarket || runningAnalysis}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  loadingMarket && !runningAnalysis ? "animate-spin" : ""
                }`}
              />
              Refresh market data
            </Button>

            <Button
              size="sm"
              onClick={() => void runDiosAnalysis()}
              disabled={loadingMarket || runningAnalysis}
            >
              {runningAnalysis ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BrainCircuit className="h-3.5 w-3.5" />
              )}
              {runningAnalysis ? "Running DIOS…" : "Run DIOS Analysis"}
            </Button>
          </div>
        </div>
      )}

      {runningAnalysis && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Running full DIOS analysis for {ticker}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Refreshing market data, fundamentals, SEC filings, earnings, news,
            institutional intelligence, portfolio impact and the final DIOS
            recommendation.
          </p>
        </div>
      )}

      {ticker && <StockPriceChart ticker={ticker} />}\n\n      {result && "error" in result && (
        <Panel title="Not found">
          <p className="p-4 text-sm text-muted-foreground">{result.error}</p>
        </Panel>
      )}

      {report && (
        <AnalysisReportActions
          report={report}
          intelligence={intelligence}
          snapshot={market}
          context={externalContext}
        />
      )}

      {intelligence && (
        <InstitutionalIntelligenceView intelligence={intelligence} />
      )}

      {report && (
        <>
          <div className="flex justify-end">
            <Button
              onClick={logRecommendation}
              disabled={logged}
              variant={logged ? "outline" : "default"}
            >
              {logged ? (
                <Check className="h-4 w-4" />
              ) : (
                <BookmarkPlus className="h-4 w-4" />
              )}
              {logged ? "Logged to history" : "Log recommendation"}
            </Button>
          </div>

          <AnalysisReportView
            report={report}
            weights={settings.weights}
          />
        </>
      )}

      {!result && (
        <Panel
          title="Start an analysis"
          description="Search for any supported US-listed stock or ETF above."
        >
          <p className="p-4 text-sm text-muted-foreground text-pretty">
            DIOS retrieves live prices, SEC fundamentals, earnings, company
            news and source verification, then maps the result to your current
            portfolio and its twelve-factor decision engine.
          </p>
        </Panel>
      )}
    </div>
  )
}

export default function AnalysePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <AnalyseInner />
    </Suspense>
  )
}
