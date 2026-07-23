"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react"
import { useDios } from "@/components/dios/store"
import { fetchLiveAnalysisReport } from "@/lib/dios/live-analysis"
import type { AnalysisReport, ExternalAnalysisContext } from "@/lib/dios/types"
import { buildIntelligenceView, getSourceFamilies, rankOpportunity } from "@/lib/dios/intelligence-view"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const DISCOVERY_UNIVERSE = [
  "VOO", "QQQ", "VT", "VTI", "DIA", "SCHD", "VIG", "VUG", "VTV", "QUAL", "USMV", "AVUV", "IWM",
  "SMH", "SOXX", "VGT", "XLK", "CIBR", "BOTZ", "ARKQ", "XLE", "VDE", "XLF", "XLV", "XLI", "XLP", "XLU",
  "ITA", "PAVE", "VNQ", "GLD", "SLV", "GDX", "COPX", "URA", "TLT", "IEF", "HYG", "LQD", "EFA", "EEM", "INDA", "EWJ", "VGK", "IBIT",
]
type LiveItem = {
  report: AnalysisReport
  context: ExternalAnalysisContext | null
  warning: string | null
  source: "live" | "fallback"
}

type OutlookState = "Bullish" | "Neutral" | "Bearish"

function classifyOutlook(item: LiveItem) {
  const view = buildIntelligenceView(item)
  return {
    state: view.outlook,
    label: view.label,
    explanation: view.explanation,
    evidenceScore: view.availableSignals,
    evidenceTotal: view.totalSignals,
    dataQuality: view.dataQuality,
    probability: view.probability,
  }
}

function sourceFamilies(item: LiveItem) {
  return getSourceFamilies(item)
}

function outlookTone(state: OutlookState) {
  if (state === "Bullish") return "text-positive"
  if (state === "Bearish") return "text-negative"
  return "text-muted-foreground"
}

function OutlookIcon({ state }: { state: OutlookState }) {
  if (state === "Bullish") return <ArrowUpRight className="h-4 w-4" />
  if (state === "Bearish") return <ArrowDownRight className="h-4 w-4" />
  return <ArrowRight className="h-4 w-4" />
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(values.length)
  let cursor = 0
  async function run() {
    while (cursor < values.length) {
      const index = cursor++
      try {
        results[index] = { status: "fulfilled", value: await worker(values[index]) }
      } catch (reason) {
        results[index] = { status: "rejected", reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, run))
  return results
}

function recommendationTone(report: AnalysisReport) {
  if (["Strong Buy", "Buy"].includes(report.recommendation)) return "text-positive"
  if (["Buy Watch", "Start Small"].includes(report.recommendation)) return "text-primary"
  if (["Sell", "Avoid", "Reduce"].includes(report.recommendation)) return "text-negative"
  return "text-muted-foreground"
}

function ItemCard({ item, owned }: { item: LiveItem; owned: boolean }) {
  const families = sourceFamilies(item)
  const move = item.report.dailyChange
  const outlook = classifyOutlook(item)

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/analyse?ticker=${item.report.ticker}`}
                className="font-mono text-base font-semibold"
              >
                {item.report.ticker}
              </Link>
              {owned && <Badge variant="outline">Held</Badge>}
              {item.source === "fallback" && (
                <Badge variant="destructive">Fallback</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{item.report.name}</p>
          </div>

          <div className="ml-auto text-right">
            <p className={`text-sm font-semibold ${recommendationTone(item.report)}`}>
              {item.report.recommendation}
            </p>
            <p className="text-xs text-muted-foreground">
              Score {item.report.overallScore}/100
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
          <div>
            <p className="text-[11px] text-muted-foreground">Current move</p>
            <p
              className={
                move >= 0
                  ? "text-sm font-semibold text-positive"
                  : "text-sm font-semibold text-negative"
              }
            >
              {move >= 0 ? "+" : ""}
              {move.toFixed(2)}%
            </p>
          </div>

          <div>
            <p className="text-[11px] text-muted-foreground">1–2 day outlook</p>
            <p
              className={`flex items-center justify-center gap-1 text-sm font-semibold ${outlookTone(outlook.state)}`}
            >
              <OutlookIcon state={outlook.state} />
              {outlook.label}
            </p>
          </div>

          <div>
            <p className="text-[11px] text-muted-foreground">Model confidence</p>
            <p className="text-sm font-semibold">{outlook.probability}%</p>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Data quality</p>
            <p className="text-xs font-semibold">
              {outlook.dataQuality}%
            </p>
          </div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: outlook.evidenceTotal }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < outlook.evidenceScore
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {outlook.explanation}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium">Why</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.report.strongestReasons[0] ??
              item.report.whyToday[0] ??
              "No strong live evidence."}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-negative">Main risk</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.report.mainRisk}
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
          <span>
            {families.length} independent source{" "}
            {families.length === 1 ? "family" : "families"}
          </span>
          <Link
            href={`/analyse?ticker=${item.report.ticker}`}
            className="inline-flex items-center gap-1 text-primary"
          >
            Evidence <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ScanPage() {
  const { portfolio, settings } = useDios()
  const [items, setItems] = useState<LiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const heldTickers = useMemo(
    () => portfolio.positions.map((position) => position.ticker),
    [portfolio.positions],
  )
  const heldSet = useMemo(() => new Set(heldTickers), [heldTickers])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const candidates = DISCOVERY_UNIVERSE.filter(
        (ticker) => !heldSet.has(ticker),
      )
      const tickers = [...heldTickers, ...candidates]

      const results = await mapWithConcurrency(
        tickers,
        6,
        (ticker) => fetchLiveAnalysisReport(ticker, portfolio, settings),
      )

      const rows = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      )
      setItems(rows)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to run the live scan.",
      )
    } finally {
      setLoading(false)
    }
  }, [heldSet, heldTickers, portfolio, settings])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const holdings = items.filter((item) => heldSet.has(item.report.ticker))

  const opportunities = items
    .filter((item) => !heldSet.has(item.report.ticker))
    .sort((a, b) => rankOpportunity(b) - rankOpportunity(a))
    .slice(0, 10)

  const holdingCounts = holdings.reduce(
    (counts, item) => {
      counts[classifyOutlook(item).state] += 1
      return counts
    },
    {
      Bullish: 0,
      Neutral: 0,
      Bearish: 0,
    } as Record<OutlookState, number>,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Daily Market Scan
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Live, risk-calibrated view of your holdings plus ranked unheld ETF
            opportunities. Every security receives a Bullish, Neutral or Bearish
            outlook; Data Quality is shown separately.
          </p>
        </div>

        <Button
          onClick={() => void refresh()}
          disabled={loading}
          className="ml-auto"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh scan
        </Button>
      </div>

      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
          <p>
            Direction and data quality are now separate. Lower-quality data reduces
            probability and conviction, but it no longer hides the directional view.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-negative/30 bg-negative/5 p-4 text-sm text-negative">
          {error}
        </div>
      )}

      {!loading && holdings.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Bullish</p>
              <p className="mt-1 text-2xl font-semibold text-positive">
                {holdingCounts.Bullish}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Neutral / no edge</p>
              <p className="mt-1 text-2xl font-semibold">
                {holdingCounts.Neutral}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Bearish</p>
              <p className="mt-1 text-2xl font-semibold text-negative">
                {holdingCounts.Bearish}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            Your holdings — next-session risk
          </h2>
        </div>

        {loading && holdings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Checking live quotes, news, filings and event risk…
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {holdings.map((item) => (
              <ItemCard
                key={item.report.ticker}
                item={item}
                owned
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-positive" />
          <h2 className="text-lg font-semibold">
            Unheld ETF opportunities — 1–2 days
          </h2>
        </div>

        <p className="text-xs text-muted-foreground">
          The best available ETFs are always ranked by DIOS score, probability and
          data quality. A Neutral label means watchlist rather than a trade signal.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          {opportunities.map((item) => (
            <ItemCard
              key={item.report.ticker}
              item={item}
              owned={false}
            />
          ))}
        </div>

        {!loading && opportunities.length === 0 && (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            ETF analysis could not be loaded. Refresh the scan or review the provider warnings.
          </p>
        )}
      </section>
    </div>
  )
}
