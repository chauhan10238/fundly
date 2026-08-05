import { NextRequest, NextResponse } from "next/server"
import type { RecommendationHorizon } from "@/lib/dios/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Point = { date: string; close: number }
const HORIZONS: Array<{ key: RecommendationHorizon; days: number }> = [
  { key: "d1", days: 1 },
  { key: "w1", days: 7 },
  { key: "m1", days: 30 },
  { key: "m3", days: 90 },
  { key: "m6", days: 180 },
  { key: "m12", days: 365 },
]

function cleanTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function firstOnOrAfter(points: Point[], target: Date) {
  const targetTime = new Date(`${dateOnly(target)}T00:00:00Z`).getTime()
  return points.find((point) => new Date(`${point.date}T00:00:00Z`).getTime() >= targetTime) ?? null
}

async function fetchFmp(ticker: string, from: string, to: string): Promise<Point[]> {
  const apiKey = process.env.FMP_API_KEY?.trim()
  if (!apiKey) throw new Error("FMP_API_KEY is not configured")
  const url = new URL("https://financialmodelingprep.com/stable/historical-price-eod/full")
  url.searchParams.set("symbol", ticker)
  url.searchParams.set("from", from)
  url.searchParams.set("to", to)
  url.searchParams.set("apikey", apiKey)
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } })
  const payload = await response.json()
  if (!response.ok) throw new Error(`FMP request failed (${response.status})`)
  if (!Array.isArray(payload)) throw new Error("FMP returned no historical rows")
  return payload.flatMap((row: any) => {
    const close = Number(row.close ?? row.price)
    const date = String(row.date ?? "").slice(0, 10)
    return date && Number.isFinite(close) ? [{ date, close }] : []
  }).sort((a, b) => a.date.localeCompare(b.date))
}

async function fetchYahoo(ticker: string, start: Date, end: Date): Promise<Point[]> {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`)
  url.searchParams.set("period1", String(Math.floor(start.getTime() / 1000)))
  url.searchParams.set("period2", String(Math.floor(end.getTime() / 1000)))
  url.searchParams.set("interval", "1d")
  url.searchParams.set("events", "div,splits")
  const response = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 (compatible; Fundly/2.0)" } })
  const payload = await response.json()
  const result = payload?.chart?.result?.[0]
  if (!response.ok || !result) throw new Error(payload?.chart?.error?.description ?? `Yahoo request failed (${response.status})`)
  const timestamps: number[] = result.timestamp ?? []
  const closes: Array<number | null> = result.indicators?.adjclose?.[0]?.adjclose ?? result.indicators?.quote?.[0]?.close ?? []
  return timestamps.flatMap((timestamp, index) => {
    const close = Number(closes[index])
    return Number.isFinite(close) ? [{ date: dateOnly(new Date(timestamp * 1000)), close }] : []
  }).sort((a, b) => a.date.localeCompare(b.date))
}

async function getSeries(ticker: string, start: Date, end: Date) {
  try {
    const points = await fetchFmp(ticker, dateOnly(start), dateOnly(end))
    if (points.length < 2) throw new Error("Insufficient FMP history")
    return { points, provider: "Financial Modeling Prep (Starter)" }
  } catch (fmpError) {
    const points = await fetchYahoo(ticker, start, end)
    if (points.length < 2) throw new Error(`FMP and Yahoo history unavailable: ${fmpError instanceof Error ? fmpError.message : "unknown FMP error"}`)
    return { points, provider: "Yahoo Finance (Fallback)" }
  }
}

export async function GET(request: NextRequest) {
  const ticker = cleanTicker(request.nextUrl.searchParams.get("ticker") ?? "")
  const benchmark = cleanTicker(request.nextUrl.searchParams.get("benchmark") ?? "SPY")
  const createdAt = new Date(request.nextUrl.searchParams.get("createdAt") ?? "")
  const priceAtRec = Number(request.nextUrl.searchParams.get("priceAtRec"))
  const benchmarkPriceAtRecParam = Number(request.nextUrl.searchParams.get("benchmarkPriceAtRec"))

  if (!ticker || !Number.isFinite(createdAt.getTime()) || !Number.isFinite(priceAtRec) || priceAtRec <= 0) {
    return NextResponse.json({ error: "ticker, createdAt and priceAtRec are required" }, { status: 400 })
  }

  const end = new Date()
  const start = new Date(createdAt.getTime() - 4 * 86_400_000)
  const [asset, benchmarkSeries] = await Promise.all([
    getSeries(ticker, start, end),
    getSeries(benchmark, start, end),
  ])

  const benchmarkBase = Number.isFinite(benchmarkPriceAtRecParam) && benchmarkPriceAtRecParam > 0
    ? benchmarkPriceAtRecParam
    : firstOnOrAfter(benchmarkSeries.points, createdAt)?.close ?? null

  const now = Date.now()
  const outcomes: Record<RecommendationHorizon, number | null> = { d1:null,w1:null,m1:null,m3:null,m6:null,m12:null }
  const benchmarkOutcomes: Record<RecommendationHorizon, number | null> = { d1:null,w1:null,m1:null,m3:null,m6:null,m12:null }
  const measurements: Array<{ horizon: RecommendationHorizon; measuredAt: string; returnPct: number; benchmarkReturnPct: number | null; alphaPct: number | null; source: string }> = []

  for (const horizon of HORIZONS) {
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
      alphaPct: benchmarkReturnPct === null ? null : Number((returnPct - benchmarkReturnPct).toFixed(2)),
      source: asset.provider === benchmarkSeries.provider ? asset.provider : `${asset.provider}; benchmark: ${benchmarkSeries.provider}`,
    })
  }

  return NextResponse.json({
    ticker,
    benchmark,
    benchmarkPriceAtRec: benchmarkBase,
    outcomes,
    benchmarkOutcomes,
    measurements,
    refreshedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } })
}
