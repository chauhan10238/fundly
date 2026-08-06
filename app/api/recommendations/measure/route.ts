import { NextRequest, NextResponse } from "next/server"
import { getFmpApiKey } from "@/lib/data-providers/fmp"
import type { RecommendationHorizon, RecommendationMeasurement } from "@/lib/dios/types"
import { PERFORMANCE_HORIZONS } from "@/lib/dios/tracking"
import {
  cleanMarketTicker,
  firstOnOrAfter,
  getHistoricalSeries,
} from "@/lib/dios/server-history"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const ticker = cleanMarketTicker(request.nextUrl.searchParams.get("ticker") ?? "")
  const benchmark = cleanMarketTicker(request.nextUrl.searchParams.get("benchmark") ?? "SPY")
  const createdAt = new Date(request.nextUrl.searchParams.get("createdAt") ?? "")
  const priceAtRec = Number(request.nextUrl.searchParams.get("priceAtRec"))
  const benchmarkPriceAtRecParam = Number(request.nextUrl.searchParams.get("benchmarkPriceAtRec"))

  if (!ticker || !Number.isFinite(createdAt.getTime()) || !Number.isFinite(priceAtRec) || priceAtRec <= 0) {
    return NextResponse.json({ error: "ticker, createdAt and priceAtRec are required" }, { status: 400 })
  }

  const end = new Date()
  const start = new Date(createdAt.getTime() - 4 * 86_400_000)

  try {
    const [asset, benchmarkSeries] = await Promise.all([
      getHistoricalSeries(ticker, start, end),
      getHistoricalSeries(benchmark, start, end),
    ])

    const benchmarkBase = Number.isFinite(benchmarkPriceAtRecParam) && benchmarkPriceAtRecParam > 0
      ? benchmarkPriceAtRecParam
      : firstOnOrAfter(benchmarkSeries.points, createdAt)?.close ?? null

    const now = Date.now()
    const outcomes: Record<RecommendationHorizon, number | null> = {
      d1: null, w1: null, m1: null, m3: null, m6: null, m12: null,
    }
    const benchmarkOutcomes: Record<RecommendationHorizon, number | null> = {
      d1: null, w1: null, m1: null, m3: null, m6: null, m12: null,
    }
    const measurements: RecommendationMeasurement[] = []

    for (const horizon of PERFORMANCE_HORIZONS) {
      const target = new Date(createdAt.getTime() + horizon.days * 86_400_000)
      if (now < target.getTime()) continue

      const assetPoint = firstOnOrAfter(asset.points, target)
      if (!assetPoint) continue
      const returnPct = Number((((assetPoint.close / priceAtRec) - 1) * 100).toFixed(2))
      const benchmarkPoint = firstOnOrAfter(benchmarkSeries.points, target)
      const benchmarkReturnPct = benchmarkBase && benchmarkPoint
        ? Number((((benchmarkPoint.close / benchmarkBase) - 1) * 100).toFixed(2))
        : null

      outcomes[horizon.key] = returnPct
      benchmarkOutcomes[horizon.key] = benchmarkReturnPct
      measurements.push({
        horizon: horizon.key,
        measuredAt: `${assetPoint.date}T21:00:00.000Z`,
        returnPct,
        benchmarkReturnPct,
        alphaPct: benchmarkReturnPct === null
          ? null
          : Number((returnPct - benchmarkReturnPct).toFixed(2)),
        source: asset.provider === benchmarkSeries.provider
          ? asset.provider
          : `${asset.provider}; benchmark: ${benchmarkSeries.provider}`,
      })
    }

    return NextResponse.json(
      {
        ticker,
        benchmark,
        benchmarkPriceAtRec: benchmarkBase,
        outcomes,
        benchmarkOutcomes,
        measurements,
        refreshedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to measure recommendation." },
      { status: 502 },
    )
  }
}
