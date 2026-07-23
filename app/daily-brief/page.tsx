"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Newspaper,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react"
import { useDios } from "@/components/dios/store"
import { fetchLiveAnalysisReport } from "@/lib/dios/live-analysis"
import { MACRO } from "@/lib/dios/macro"
import { fmtCurrency } from "@/lib/format"
import type {
  AnalysisReport,
  ExternalAnalysisContext,
  LiveNewsItem,
  SourceCitation,
} from "@/lib/dios/types"
import { Button } from "@/components/ui/button"

const ETF_CANDIDATES = [
  "SCHD",
  "VIG",
  "AVUV",
  "VOO",
  "VT",
  "QQQ",
  "XLE",
  "VDE",
  "GLD",
  "SMH",
]

type BriefItem = {
  report: AnalysisReport
  context: ExternalAnalysisContext | null
}

function decisionClass(decision: string) {
  if (decision === "Strong Buy" || decision === "Buy") {
    return "bg-positive/10 text-positive"
  }
  if (decision === "Buy Watch" || decision === "Start Small") {
    return "bg-primary/10 text-primary"
  }
  if (decision === "Reduce") {
    return "bg-warning/10 text-warning-foreground"
  }
  if (decision === "Sell" || decision === "Avoid") {
    return "bg-negative/10 text-negative"
  }
  return "bg-muted text-muted-foreground"
}

function scoreClass(score: number) {
  if (score >= 80) return "text-positive"
  if (score >= 65) return "text-primary"
  if (score >= 45) return "text-warning-foreground"
  return "text-negative"
}

function uniqueSources(items: BriefItem[]): SourceCitation[] {
  const seen = new Set<string>()
  const sources: SourceCitation[] = []

  for (const item of items) {
    for (const source of item.report.sources ?? []) {
      const key = source.url || `${source.name}-${source.date}`
      if (seen.has(key)) continue
      seen.add(key)
      sources.push(source)
    }
  }

  return sources
}

function uniqueNews(items: BriefItem[]): Array<LiveNewsItem & { ticker: string }> {
  const seen = new Set<string>()
  const news: Array<LiveNewsItem & { ticker: string }> = []

  for (const item of items) {
    for (const article of item.context?.news ?? []) {
      const key = article.url || article.title
      if (seen.has(key)) continue
      seen.add(key)
      news.push({ ...article, ticker: item.report.ticker })
    }
  }

  return news.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export default function DailyBriefPage() {
  const { portfolio, settings } = useDios()
  const [holdings, setHoldings] = useState<BriefItem[]>([])
  const [opportunities, setOpportunities] = useState<BriefItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshBrief = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const heldTickers = portfolio.positions.map((position) => position.ticker)
      const heldSet = new Set(heldTickers)

      const holdingResults = await Promise.all(
        heldTickers.map(async (ticker) => {
          const result = await fetchLiveAnalysisReport(ticker, portfolio, settings)
          return { report: result.report, context: result.context }
        }),
      )

      const candidateTickers = ETF_CANDIDATES.filter(
        (ticker) => !heldSet.has(ticker),
      )

      const candidateResults = await Promise.all(
        candidateTickers.map(async (ticker) => {
          const result = await fetchLiveAnalysisReport(ticker, portfolio, settings)
          return { report: result.report, context: result.context }
        }),
      )

      setHoldings(holdingResults)
      setOpportunities(
        candidateResults
          .filter((item) =>
            ["Strong Buy", "Buy", "Buy Watch", "Start Small"].includes(
              item.report.recommendation,
            ),
          )
          .sort((a, b) => b.report.overallScore - a.report.overallScore)
          .slice(0, 5),
      )
      setLastUpdated(new Date().toISOString())
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to generate the Daily Briefing",
      )
    } finally {
      setLoading(false)
    }
  }, [portfolio, settings])

  useEffect(() => {
    void refreshBrief()

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshBrief()
      }
    }, Math.max(settings.dataRefreshMinutes, 15) * 60_000)

    return () => window.clearInterval(timer)
  }, [refreshBrief, settings.dataRefreshMinutes])

  const portfolioHealth = useMemo(() => {
    if (holdings.length === 0) return 0

    const weighted = holdings.reduce((sum, item) => {
      const position = portfolio.positions.find(
        (candidate) => candidate.ticker === item.report.ticker,
      )
      return sum + item.report.overallScore * ((position?.weight ?? 0) / 100)
    }, 0)

    return Math.round(weighted)
  }, [holdings, portfolio.positions])

  const actionItems = useMemo(
    () =>
      holdings
        .filter((item) =>
          ["Reduce", "Sell", "Avoid"].includes(item.report.recommendation),
        )
        .sort((a, b) => a.report.overallScore - b.report.overallScore),
    [holdings],
  )

  const largestWinner = useMemo(
    () =>
      [...portfolio.positions].sort(
        (a, b) => b.dayChangeValue - a.dayChangeValue,
      )[0],
    [portfolio.positions],
  )

  const largestLoser = useMemo(
    () =>
      [...portfolio.positions].sort(
        (a, b) => a.dayChangeValue - b.dayChangeValue,
      )[0],
    [portfolio.positions],
  )

  const news = useMemo(
    () => uniqueNews([...holdings, ...opportunities]).slice(0, 16),
    [holdings, opportunities],
  )

  const sources = useMemo(
    () => uniqueSources([...holdings, ...opportunities]),
    [holdings, opportunities],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">DIOS CIO Desk</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Daily Morning Brief
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Portfolio actions, market context, relevant news and the highest-scoring
            ETF opportunities in one view.
          </p>
        </div>

        <Button variant="outline" onClick={() => void refreshBrief()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh briefing
        </Button>
      </header>

      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <strong>
          {loading
            ? "Generating current briefing…"
            : error
              ? "Briefing refresh encountered an issue"
              : "Briefing ready"}
        </strong>
        <span className="ml-2 text-muted-foreground">
          {lastUpdated
            ? `Updated ${new Date(lastUpdated).toLocaleString()}`
            : "Waiting for live analysis"}
        </span>
        {error ? <div className="mt-2 text-negative">{error}</div> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Metric label="Portfolio Health" value={`${portfolioHealth}/100`} />
        <Metric
          label="Today's Portfolio Change"
          value={`${portfolio.dayChangeValue >= 0 ? "+" : ""}${fmtCurrency(portfolio.dayChangeValue, "USD", 0)}`}
          tone={portfolio.dayChangeValue >= 0 ? "positive" : "negative"}
        />
        <Metric
          label="Largest Winner Today"
          value={
            largestWinner
              ? `${largestWinner.ticker} ${largestWinner.dayChangeValue >= 0 ? "+" : ""}${fmtCurrency(largestWinner.dayChangeValue, "USD", 0)}`
              : "—"
          }
          tone="positive"
        />
        <Metric
          label="Largest Loser Today"
          value={
            largestLoser
              ? `${largestLoser.ticker} ${fmtCurrency(largestLoser.dayChangeValue, "USD", 0)}`
              : "—"
          }
          tone="negative"
        />
        <Metric
          label="Actions Required"
          value={String(actionItems.length)}
          tone={actionItems.length ? "negative" : "positive"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning-foreground" />
              <h2 className="font-semibold">Action Required</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Positions where the unified DIOS engine recommends reducing risk.
            </p>
          </div>

          <div className="divide-y divide-border">
            {actionItems.length ? (
              actionItems.map(({ report }) => (
                <div key={report.ticker} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link
                        href={`/analyse?ticker=${report.ticker}`}
                        className="font-mono text-lg font-semibold hover:underline"
                      >
                        {report.ticker}
                      </Link>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {report.mainRisk}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${decisionClass(report.recommendation)}`}
                      >
                        {report.recommendation}
                      </span>
                      <div className={`mt-2 font-mono font-semibold ${scoreClass(report.overallScore)}`}>
                        {report.overallScore}/100
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Confidence {report.confidence}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
                    {report.concentrationWarnings[0] ??
                      report.strongestReasons[0] ??
                      report.decisionChangeCondition}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                No urgent Reduce, Sell or Avoid actions were identified.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Highest-Scoring ETF Opportunities</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              ETFs not currently held, ranked against your existing portfolio.
            </p>
          </div>

          <div className="divide-y divide-border">
            {opportunities.map(({ report }) => (
              <div key={report.ticker} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/analyse?ticker=${report.ticker}`}
                      className="font-mono text-lg font-semibold hover:underline"
                    >
                      {report.ticker}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {report.name}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${decisionClass(report.recommendation)}`}
                    >
                      {report.recommendation}
                    </span>
                    <div className={`mt-2 font-mono font-semibold ${scoreClass(report.overallScore)}`}>
                      {report.overallScore}/100
                    </div>
                  </div>
                </div>

                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {report.strongestReasons.slice(0, 3).map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              </div>
            ))}

            {!loading && opportunities.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No candidate ETF currently meets the DIOS opportunity filter.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            <h2 className="font-semibold">Portfolio and Opportunity News</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Current articles returned by the live analysis context for held securities
            and shortlisted ETFs.
          </p>
        </div>

        <div className="grid gap-3 p-5 lg:grid-cols-2">
          {news.map((article) => (
            <a
              key={`${article.ticker}-${article.url}`}
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-semibold">
                  {article.ticker}
                </span>
                <span className="text-xs text-muted-foreground">
                  {article.source}
                </span>
              </div>
              <h3 className="mt-2 font-medium">{article.title}</h3>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(article.publishedAt).toLocaleString()}</span>
                <span className="capitalize">{article.sentiment}</span>
              </div>
            </a>
          ))}

          {!loading && news.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No current portfolio-specific news was returned.
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold">Macro Snapshot</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MacroItem label="Regime" value={MACRO.regime} />
            <MacroItem label="Macro Score" value={`${MACRO.score}/100`} />
            <MacroItem
              label="Bias"
              value={
                MACRO.regime.toLowerCase().includes("easing")
                  ? "Easing / supportive"
                  : "Neutral / mixed"
              }
            />
            <MacroItem
              label="Portfolio Read-through"
              value={
                portfolio.largestSector
                  ? `${portfolio.largestSector.label} ${portfolio.largestSector.pct.toFixed(1)}%`
                  : "No concentration data"
              }
            />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <h2 className="font-semibold">Sources Used in This Brief</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Only sources actually returned by the current DIOS analysis are shown.
          </p>

          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
            {sources.map((source) => (
              <a
                key={source.url || `${source.name}-${source.date}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border border-border p-3 hover:bg-muted/40"
              >
                <div className="text-sm font-medium">{source.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Dated {source.date} · retrieved{" "}
                  {new Date(source.retrieved).toLocaleString()}
                </div>
              </a>
            ))}

            {!loading && sources.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No source records were returned.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Data transparency:</strong> this first Daily Briefing release
            uses the providers already connected to DIOS, including live quote and
            ticker-news sources returned by the analysis API. It does not claim to
            use 20 providers yet. Additional licensed providers should be activated
            only after API keys, redistribution rights, costs and rate limits are
            confirmed.
          </div>
        </div>
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "positive" | "negative"
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 text-xl font-semibold ${
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function MacroItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  )
}
