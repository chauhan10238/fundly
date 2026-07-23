"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { useDios } from "@/components/dios/store"
import { Button } from "@/components/ui/button"
import { Panel, StatCard } from "@/components/dios/ui-bits"
import type { DailyBriefResponse } from "@/lib/dios/daily-brief-types"

function signed(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`
}

function outlookClass(value: string) {
  if (value === "Bullish") return "text-positive bg-positive/10"
  if (value === "Bearish") return "text-negative bg-negative/10"
  return "text-warning-foreground bg-warning/10"
}

export default function DailyBriefPage() {
  const { portfolio } = useDios()
  const [brief, setBrief] = useState<DailyBriefResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/daily-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          holdings: portfolio.positions.map((position) => ({
            ticker: position.ticker,
            weight: position.weight,
            marketValue: position.marketValue,
            dayChangeValue: position.dayChangeValue,
            dayChangePct: position.dayChangePct,
            unrealisedPL: position.unrealisedPL,
            unrealisedPLPct: position.unrealisedPLPct,
          })),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Daily Brief failed")
      setBrief(payload)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Daily Brief failed")
    } finally {
      setLoading(false)
    }
  }, [portfolio.positions])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Daily Intelligence Brief</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Market, portfolio, multi-timeframe outlook, risk and ranked ETF opportunities.
          </p>
        </div>
        <Button onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Building brief…" : "Refresh brief"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-negative/40 bg-negative/10 p-4 text-sm text-negative">
          {error}
        </div>
      )}

      {!brief && !error && (
        <Panel title="Building Daily Brief">
          <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Analysing your holdings and ETF opportunity universe…
          </div>
        </Panel>
      )}

      {brief && (
        <>
          <div className={`rounded-lg border p-4 ${
            brief.status === "live"
              ? "border-positive/30 bg-positive/5"
              : "border-warning/40 bg-warning/10"
          }`}>
            <div className="font-medium">
              {brief.status === "live" ? "Live multi-source brief" : "Partial live brief"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Generated {new Date(brief.generatedAt).toLocaleString()} · Sources:{" "}
              {brief.sourceSummary.sourceFamilies.join(", ") || "No source family returned"}
            </div>
          </div>

          <Panel title="Overnight Market" description={brief.market.summary}>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
              {brief.market.items.slice(0, 10).map((item) => (
                <div key={item.symbol} className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="mt-1 font-mono text-lg font-semibold">
                    {item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-sm ${item.changePercent >= 0 ? "text-positive" : "text-negative"}`}>
                    {signed(item.changePercent)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Portfolio Health" value={`${brief.portfolio.healthScore}/100`} detail="Combined quality and risk" />
            <StatCard label="Market Alignment" value={`${brief.portfolio.marketAlignment}/100`} detail={brief.market.regime} />
            <StatCard label="Diversification" value={`${brief.portfolio.diversification}/100`} detail="Position concentration" />
            <StatCard label="Risk Score" value={`${brief.portfolio.riskScore}/100`} detail="Higher means more risk" />
          </div>

          <Panel title="Holdings Intelligence" description="Today, 1–3 day and 1–4 week views are kept separate.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Ticker</th>
                    <th className="p-3 text-right">Score</th>
                    <th className="p-3">Today</th>
                    <th className="p-3">1–3 Days</th>
                    <th className="p-3">1–4 Weeks</th>
                    <th className="p-3">Risk</th>
                    <th className="p-3 text-right">Data Quality</th>
                    <th className="p-3">Main Driver</th>
                  </tr>
                </thead>
                <tbody>
                  {brief.portfolio.holdings.map((item) => (
                    <tr key={item.ticker} className="border-b border-border/70">
                      <td className="p-3 font-mono font-semibold">{item.ticker}</td>
                      <td className="p-3 text-right font-mono font-semibold">{item.score}</td>
                      <td className="p-3"><span className={`rounded px-2 py-1 text-xs ${outlookClass(item.todayBias)}`}>{item.todayBias}</span></td>
                      <td className="p-3"><span className={`rounded px-2 py-1 text-xs ${outlookClass(item.shortOutlook)}`}>{item.shortOutlook}</span></td>
                      <td className="p-3"><span className={`rounded px-2 py-1 text-xs ${outlookClass(item.mediumOutlook)}`}>{item.mediumOutlook}</span></td>
                      <td className="p-3">{item.risk}</td>
                      <td className="p-3 text-right">
                        <div className="font-mono">{item.dataQuality}%</div>
                        <div className="text-[10px] text-muted-foreground">{item.availableSignals}/{item.totalSignals} checks</div>
                      </td>
                      <td className="max-w-xs p-3 text-muted-foreground">{item.reasons[0] || "Price and score model"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="High-Scoring ETF Opportunities" description="Ranked by score, confidence and data quality; not artificially boosted.">
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              {brief.opportunities.length ? brief.opportunities.map((item, index) => (
                <div key={item.ticker} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-lg font-semibold">{item.ticker}</div>
                    <div className="text-xs text-muted-foreground">#{index + 1}</div>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <div className="text-3xl font-semibold">{item.score}</div>
                    <div className="pb-1 text-xs text-muted-foreground">DIOS score</div>
                  </div>
                  <div className="mt-2 text-xs">
                    Confidence {item.confidence}% · Quality {item.dataQuality}%
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {item.reasons[0] || "Positive composite signal"}
                  </div>
                </div>
              )) : (
                <div className="col-span-full p-3 text-sm text-muted-foreground">
                  No ETF cleared the bullish quality gate today. The system will not manufacture opportunities.
                </div>
              )}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Portfolio Risks">
              <div className="space-y-3 p-4">
                {brief.risks.map((risk) => (
                  <div key={risk} className="flex gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
                    <span>{risk}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Today's Actions">
              <div className="space-y-3 p-4">
                {brief.actions.map((action) => (
                  <div key={action} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {brief.warnings.length > 0 && (
            <Panel title="Data Warnings">
              <div className="space-y-2 p-4 text-sm text-muted-foreground">
                {brief.warnings.map((warning) => <div key={warning}>• {warning}</div>)}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  )
}
