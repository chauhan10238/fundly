import { NextRequest, NextResponse } from "next/server"
import { PROFILE_COOKIE_NAME, readProfileSession } from "@/lib/dios/profile-auth"
import {
  SUREN_TRACKING_START_DATE,
  TRACKING_BENCHMARK,
  emptyPerformanceOutcomes,
} from "@/lib/dios/tracking"
import {
  cleanMarketTicker,
  getHistoricalSeries,
  lastOnOrBefore,
} from "@/lib/dios/server-history"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

type HoldingInput = {
  ticker?: string
  quantity?: number
  avgCost?: number
}

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
  if (profileId !== "suren") {
    return NextResponse.json({ error: "Existing-holding baselines are available only for Suren's profile." }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as {
    date?: string
    holdings?: HoldingInput[]
  } | null

  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.date ?? ""))
    ? String(body?.date)
    : SUREN_TRACKING_START_DATE
  const holdingsInput = body?.holdings
  const holdings = Array.isArray(holdingsInput) ? holdingsInput.slice(0, 12) : []
  if (!holdings.length) {
    return NextResponse.json({ error: "At least one holding is required." }, { status: 400 })
  }

  const target = new Date(`${date}T23:59:59.999Z`)
  const rangeStart = new Date(target.getTime() - 10 * 86_400_000)
  const rangeEnd = new Date(target.getTime() + 2 * 86_400_000)

  let benchmarkPrice: number | null = null
  let benchmarkProvider = "Unavailable"
  try {
    const benchmark = await getHistoricalSeries(TRACKING_BENCHMARK, rangeStart, rangeEnd)
    benchmarkPrice = lastOnOrBefore(benchmark.points, target)?.close ?? null
    benchmarkProvider = benchmark.provider
  } catch {
    // Baselines can still be created even if the benchmark is temporarily unavailable.
  }

  const rows = await mapLimit(holdings, 4, async (holding) => {
    const ticker = cleanMarketTicker(String(holding.ticker ?? ""))
    const quantity = Math.max(0, Number(holding.quantity) || 0)
    const avgCost = Math.max(0, Number(holding.avgCost) || 0)
    if (!ticker || quantity <= 0) {
      return { ticker, error: "Invalid ticker or quantity." }
    }

    try {
      const series = await getHistoricalSeries(ticker, rangeStart, rangeEnd)
      const point = lastOnOrBefore(series.points, target)
      if (!point) throw new Error(`No closing price was found on or before ${date}`)

      return {
        ticker,
        baseline: {
          id: `baseline-${date}-${ticker}`,
          ticker,
          startDate: date,
          startAt: `${point.date}T21:00:00.000Z`,
          quantity,
          avgCost,
          baselinePrice: point.close,
          baselineValue: Number((quantity * point.close).toFixed(2)),
          priceDate: point.date,
          provider: series.provider,
          benchmarkTicker: TRACKING_BENCHMARK,
          benchmarkPrice,
          createdAt: new Date().toISOString(),
          status: "active" as const,
          outcomes: emptyPerformanceOutcomes(),
          benchmarkOutcomes: emptyPerformanceOutcomes(),
          measurements: [],
        },
      }
    } catch (error) {
      return {
        ticker,
        error: error instanceof Error ? error.message : "Unable to retrieve the baseline price.",
      }
    }
  })

  return NextResponse.json(
    {
      date,
      benchmark: TRACKING_BENCHMARK,
      benchmarkPrice,
      benchmarkProvider,
      results: rows,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  )
}
