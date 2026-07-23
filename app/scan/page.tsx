"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowUpRight, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react"
import { useDios } from "@/components/dios/store"
import { fetchLiveAnalysisReport } from "@/lib/dios/live-analysis"
import type { AnalysisReport, ExternalAnalysisContext } from "@/lib/dios/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const DISCOVERY_UNIVERSE = [
  "VOO", "QQQ", "VT", "VTI", "SCHD", "VIG", "AVUV", "IWM",
  "SMH", "SOXX", "VGT", "XLK", "XLE", "VDE", "XLF", "XLV",
  "GLD", "TLT", "USMV", "QUAL",
]

type LiveItem = {
  report: AnalysisReport
  context: ExternalAnalysisContext | null
  warning: string | null
  source: "live" | "fallback"
}

function sourceFamilies(item: LiveItem) {
  const names = new Set<string>()
  for (const source of item.report.sources ?? []) {
    const value = source.name.toLowerCase()
    if (value.includes("yahoo")) names.add("Yahoo")
    if (value.includes("alpha vantage")) names.add("Alpha Vantage")
    if (value.includes("finnhub")) names.add("Finnhub")
    if (value.includes("sec") || value.includes("edgar")) names.add("SEC")
    if (value.includes("financial modeling prep")) names.add("FMP")
  }
  for (const news of item.context?.news ?? []) {
    if (news.source) names.add(news.source)
  }
  return [...names]
}

function tone(report: AnalysisReport) {
  if (["Strong Buy", "Buy"].includes(report.recommendation)) return "text-positive"
  if (["Buy Watch", "Start Small"].includes(report.recommendation)) return "text-primary"
  if (["Sell", "Avoid", "Reduce"].includes(report.recommendation)) return "text-negative"
  return "text-muted-foreground"
}

function ItemCard({ item, owned }: { item: LiveItem; owned: boolean }) {
  const sources = sourceFamilies(item)
  const move = item.report.dailyChange
  const outlook =
    item.report.recommendation === "Strong Buy" || item.report.recommendation === "Buy"
      ? "Positive bias"
      : item.report.recommendation === "Sell" || item.report.recommendation === "Avoid"
        ? "Negative bias"
        : "Wait / mixed"

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/analyse?ticker=${item.report.ticker}`} className="font-mono text-base font-semibold">
                {item.report.ticker}
              </Link>
              {owned && <Badge variant="outline">Held</Badge>}
              {item.source === "fallback" && <Badge variant="destructive">Fallback</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{item.report.name}</p>
          </div>
          <div className="ml-auto text-right">
            <p className={`text-sm font-semibold ${tone(item.report)}`}>{item.report.recommendation}</p>
            <p className="text-xs text-muted-foreground">Score {item.report.overallScore}/100</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
          <div>
            <p className="text-[11px] text-muted-foreground">Current move</p>
            <p className={move >= 0 ? "text-sm font-semibold text-positive" : "text-sm font-semibold text-negative"}>
              {move >= 0 ? "+" : ""}{move.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">1–2 day outlook</p>
            <p className="text-sm font-semibold">{outlook}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Confidence</p>
            <p className="text-sm font-semibold">{item.report.confidence}%</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium">Why</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.report.strongestReasons[0] ?? item.report.whyToday[0] ?? "No strong live evidence."}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-negative">Main risk</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.report.mainRisk}</p>
        </div>

        <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
          <span>{sources.length} source families</span>
          <Link href={`/analyse?ticker=${item.report.ticker}`} className="inline-flex items-center gap-1 text-primary">
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
  const heldTickers = useMemo(() => portfolio.positions.map((position) => position.ticker), [portfolio.positions])
  const heldSet = useMemo(() => new Set(heldTickers), [heldTickers])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const candidates = DISCOVERY_UNIVERSE.filter((ticker) => !heldSet.has(ticker))
      const tickers = [...heldTickers, ...candidates]
      const results = await Promise.allSettled(
        tickers.map((ticker) => fetchLiveAnalysisReport(ticker, portfolio, settings)),
      )
      const rows = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      )
      setItems(rows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to run the live scan.")
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
    .filter((item) => ["Strong Buy", "Buy", "Start Small", "Buy Watch"].includes(item.report.recommendation))
    .sort((a, b) => b.report.overallScore - a.report.overallScore)
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Daily Market Scan</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Live, risk-calibrated view of your holdings plus unheld ETF opportunities. A score is downgraded when independent sources do not agree, event risk is high, or the security has already made an extreme move.
          </p>
        </div>
        <Button onClick={() => void refresh()} disabled={loading} className="ml-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh scan
        </Button>
      </div>

      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
          <p>
            “1–2 day outlook” is a probability-based bias, not a promised return. DIOS now blocks confident Buy labels when evidence is weak or insufficiently diverse.
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-negative/30 bg-negative/5 p-4 text-sm text-negative">{error}</div>}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Your holdings — next-session risk</h2>
        </div>
        {loading && holdings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Checking live quotes, news, filings and event risk…</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {holdings.map((item) => <ItemCard key={item.report.ticker} item={item} owned />)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-positive" />
          <h2 className="text-lg font-semibold">Unheld ETF opportunities — 1–2 days</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Only candidates that survive the source-diversity and volatility gates are shown.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {opportunities.map((item) => <ItemCard key={item.report.ticker} item={item} owned={false} />)}
        </div>
        {!loading && opportunities.length === 0 && (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            No unheld ETF currently meets the calibrated threshold. “No trade” is a valid result.
          </p>
        )}
      </section>
    </div>
  )
}
