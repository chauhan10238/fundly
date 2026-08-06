"use client"

import { useMemo } from "react"
import { Activity, RefreshCw } from "lucide-react"
import { useDios } from "@/components/dios/store"
import { useProfile } from "@/components/dios/profile-provider"
import { fmtCurrency } from "@/lib/format"
import { PERFORMANCE_HORIZONS } from "@/lib/dios/tracking"
import type { ExistingHoldingBaseline, RecommendationHorizon } from "@/lib/dios/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function fmtReturn(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Pending"
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

function returnTone(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "text-muted-foreground"
  return value >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
}

function latestOutcome(baseline: ExistingHoldingBaseline) {
  return baseline.outcomes.m12 ??
    baseline.outcomes.m6 ??
    baseline.outcomes.m3 ??
    baseline.outcomes.m1 ??
    baseline.outcomes.w1 ??
    baseline.outcomes.d1
}

export function ExistingHoldingsTracking() {
  const {
    portfolio,
    holdings,
    holdingBaselines,
    tracking,
    refreshHoldingBaselines,
    refreshBaselineMeasurements,
  } = useDios()
  const { activeProfile } = useProfile()

  const summary = useMemo(() => {
    const positions = new Map(portfolio.positions.map((position) => [position.ticker, position]))
    const rows = holdingBaselines
      .map((baseline) => {
        const position = positions.get(baseline.ticker)
        const currentPrice = position?.price ?? null
        const currentQuantity = position?.quantity ?? 0
        const liveReturn = currentPrice && baseline.baselinePrice
          ? ((currentPrice / baseline.baselinePrice) - 1) * 100
          : latestOutcome(baseline)
        return {
          baseline,
          position,
          currentPrice,
          currentQuantity,
          liveReturn,
          cohortCurrentValue: currentPrice ? baseline.quantity * currentPrice : null,
        }
      })
      .sort((a, b) => b.baseline.baselineValue - a.baseline.baselineValue)

    const baselineValue = rows.reduce((sum, row) => sum + row.baseline.baselineValue, 0)
    const comparable = rows.filter((row) => row.cohortCurrentValue !== null)
    const cohortCurrentValue = comparable.reduce((sum, row) => sum + (row.cohortCurrentValue ?? 0), 0)
    const cohortBaselineValue = comparable.reduce((sum, row) => sum + row.baseline.baselineValue, 0)
    const cohortReturn = cohortBaselineValue
      ? ((cohortCurrentValue / cohortBaselineValue) - 1) * 100
      : null

    return {
      rows,
      baselineValue,
      cohortCurrentValue,
      cohortReturn,
      targetCount: tracking?.baselineTickers?.length ?? holdings.length,
      coverage: (tracking?.baselineTickers?.length ?? holdings.length)
        ? holdingBaselines.length / (tracking?.baselineTickers?.length ?? holdings.length) * 100
        : 0,
    }
  }, [holdingBaselines, holdings.length, portfolio.positions, tracking?.baselineTickers])

  const refreshing = tracking?.baselineStatus === "building"

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Existing Holdings Performance
            </CardTitle>
            <CardDescription>
              Tracks the positions {activeProfile?.name ?? "this investor"} already owned from {tracking?.startDate ?? "the tracking start date"}. This is portfolio performance—not an AI recommendation—and is excluded from Fundly Accuracy.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => void (async () => {
              await refreshHoldingBaselines()
              await refreshBaselineMeasurements()
            })()}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh tracking
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Baseline coverage</p>
            <p className="mt-2 text-2xl font-semibold">{summary.coverage.toFixed(0)}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{holdingBaselines.length} of {summary.targetCount} opening holdings</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Opening value</p>
            <p className="mt-2 text-2xl font-semibold">{fmtCurrency(summary.baselineValue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Verified historical closes</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Baseline cohort today</p>
            <p className="mt-2 text-2xl font-semibold">{fmtCurrency(summary.cohortCurrentValue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Original quantities at current prices</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Return since start</p>
            <p className={`mt-2 text-2xl font-semibold ${returnTone(summary.cohortReturn)}`}>{fmtReturn(summary.cohortReturn)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Baseline cohort, not realised P/L</p>
          </div>
        </CardContent>
      </Card>

      {tracking?.baselineError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some baseline prices could not be retrieved yet: {tracking.baselineError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Holding-by-holding baseline</CardTitle>
          <CardDescription>
            Baseline prices use the verified close on {tracking?.startDate ?? "the profile tracking date"}, or the nearest prior trading close when the market was closed. FMP is primary; Yahoo Finance is fallback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!summary.rows.length ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Fundly is building the opening baseline. Keep this page open briefly, then refresh tracking.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Ticker</th>
                    <th className="pr-3 text-right">Opening qty</th>
                    <th className="pr-3 text-right">Current qty</th>
                    <th className="pr-3 text-right">Baseline close</th>
                    <th className="pr-3 text-right">Current price</th>
                    <th className="pr-3 text-right">Since start</th>
                    {PERFORMANCE_HORIZONS.slice(0, 3).map((horizon) => (
                      <th key={horizon.key} className="pr-3 text-right">{horizon.label}</th>
                    ))}
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map(({ baseline, currentQuantity, currentPrice, liveReturn }) => (
                    <tr key={baseline.id} className="border-b">
                      <td className="py-2 pr-3 font-mono font-semibold">{baseline.ticker}</td>
                      <td className="pr-3 text-right">{baseline.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                      <td className="pr-3 text-right">{currentQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                      <td className="pr-3 text-right">{fmtCurrency(baseline.baselinePrice)}</td>
                      <td className="pr-3 text-right">{currentPrice ? fmtCurrency(currentPrice) : "Unavailable"}</td>
                      <td className={`pr-3 text-right font-medium ${returnTone(liveReturn)}`}>{fmtReturn(liveReturn)}</td>
                      {(["d1", "w1", "m1"] as RecommendationHorizon[]).map((horizon) => (
                        <td key={horizon} className={`pr-3 text-right ${returnTone(baseline.outcomes[horizon])}`}>
                          {fmtReturn(baseline.outcomes[horizon])}
                        </td>
                      ))}
                      <td>
                        <Badge variant="outline">{baseline.provider}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
