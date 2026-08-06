import { NextRequest, NextResponse } from "next/server"
import type {
  ExistingHoldingBaseline,
  RecommendationHorizon,
  RecommendationMeasurement,
} from "@/lib/dios/types"
import { PROFILE_COOKIE_NAME, readProfileSession } from "@/lib/dios/profile-auth"
import { PERFORMANCE_HORIZONS, TRACKING_BENCHMARK } from "@/lib/dios/tracking"
import { firstOnOrAfter, getHistoricalSeries } from "@/lib/dios/server-history"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length)
  let index = 0
  async function worker() {
    while (true) {
      const current = index++
      if (current >= items.length) return
      results[current] = await mapper(items[current])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

export async function POST(request: NextRequest) {
  const profileId = readProfileSession(request.cookies.get(PROFILE_COOKIE_NAME)?.value)
  if (!profileId) {
    return NextResponse.json({ error: "A valid investor profile session is required." }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    baselines?: ExistingHoldingBaseline[]
  } | null
  const baselinesInput = body?.baselines
  const baselines = Array.isArray(baselinesInput) ? baselinesInput.slice(0, 12) : []
  if (!baselines.length) {
    return NextResponse.json({ error: "At least one baseline is required." }, { status: 400 })
  }

  const now = new Date()
  const rows = await mapLimit(baselines, 4, async (baseline) => {
    try {
      const startAt = new Date(baseline.startAt)
      if (!Number.isFinite(startAt.getTime()) || baseline.baselinePrice <= 0) {
        throw new Error("The baseline date or price is invalid.")
      }

      const rangeStart = new Date(startAt.getTime() - 4 * 86_400_000)
      const [asset, benchmark] = await Promise.all([
        getHistoricalSeries(baseline.ticker, rangeStart, now),
        getHistoricalSeries(baseline.benchmarkTicker || TRACKING_BENCHMARK, rangeStart, now),
      ])

      const benchmarkBase = baseline.benchmarkPrice ?? firstOnOrAfter(benchmark.points, startAt)?.close ?? null
      const outcomes = { ...baseline.outcomes }
      const benchmarkOutcomes = { ...baseline.benchmarkOutcomes }
      const measurements = [...(baseline.measurements ?? [])]

      for (const horizon of PERFORMANCE_HORIZONS) {
        if (outcomes[horizon.key] !== null) continue
        const target = new Date(startAt.getTime() + horizon.days * 86_400_000)
        if (now.getTime() < target.getTime()) continue

        const assetPoint = firstOnOrAfter(asset.points, target)
        if (!assetPoint) continue
        const returnPct = Number((((assetPoint.close / baseline.baselinePrice) - 1) * 100).toFixed(2))
        const benchmarkPoint = firstOnOrAfter(benchmark.points, target)
        const benchmarkReturnPct = benchmarkBase && benchmarkPoint
          ? Number((((benchmarkPoint.close / benchmarkBase) - 1) * 100).toFixed(2))
          : null
        const measurement: RecommendationMeasurement = {
          horizon: horizon.key,
          measuredAt: `${assetPoint.date}T21:00:00.000Z`,
          returnPct,
          benchmarkReturnPct,
          alphaPct: benchmarkReturnPct === null
            ? null
            : Number((returnPct - benchmarkReturnPct).toFixed(2)),
          source: asset.provider === benchmark.provider
            ? asset.provider
            : `${asset.provider}; benchmark: ${benchmark.provider}`,
        }

        outcomes[horizon.key] = returnPct
        benchmarkOutcomes[horizon.key] = benchmarkReturnPct
        const existing = measurements.findIndex((item) => item.horizon === horizon.key)
        if (existing >= 0) measurements[existing] = measurement
        else measurements.push(measurement)
      }

      return {
        id: baseline.id,
        ticker: baseline.ticker,
        benchmarkPrice: benchmarkBase,
        outcomes,
        benchmarkOutcomes,
        measurements,
      }
    } catch (error) {
      return {
        id: baseline.id,
        ticker: baseline.ticker,
        error: error instanceof Error ? error.message : "Unable to measure this baseline.",
      }
    }
  })

  return NextResponse.json(
    { results: rows, measuredAt: new Date().toISOString() },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  )
}
