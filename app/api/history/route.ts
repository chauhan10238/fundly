import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RangeKey = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y"
type PricePoint = { timestamp: string; close: number; volume: number }

const VALID_RANGES = new Set<RangeKey>(["1D", "5D", "1M", "3M", "6M", "1Y", "3Y", "5Y"])

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

function rangeDays(range: RangeKey) {
  return ({ "1D": 2, "5D": 7, "1M": 35, "3M": 100, "6M": 190, "1Y": 370, "3Y": 1100, "5Y": 1850 })[range]
}

function fmpSettings(range: RangeKey) {
  if (range === "1D") return { endpoint: "historical-chart/5min", interval: "5m", label: "5-minute" }
  if (range === "5D") return { endpoint: "historical-chart/15min", interval: "15m", label: "15-minute" }
  if (range === "1M") return { endpoint: "historical-chart/1hour", interval: "1h", label: "hourly" }
  return { endpoint: "historical-price-eod/full", interval: range === "3Y" || range === "5Y" ? "1wk" : "1d", label: range === "3Y" || range === "5Y" ? "weekly" : "daily" }
}

function yahooSettings(range: RangeKey) {
  switch (range) {
    case "1D": return { yahooRange: "1d", interval: "5m", label: "5-minute" }
    case "5D": return { yahooRange: "5d", interval: "15m", label: "15-minute" }
    case "1M": return { yahooRange: "1mo", interval: "1h", label: "hourly" }
    case "3M": return { yahooRange: "3mo", interval: "1d", label: "daily" }
    case "6M": return { yahooRange: "6mo", interval: "1d", label: "daily" }
    case "1Y": return { yahooRange: "1y", interval: "1d", label: "daily" }
    case "3Y": return { yahooRange: "3y", interval: "1wk", label: "weekly" }
    case "5Y": return { yahooRange: "5y", interval: "1wk", label: "weekly" }
  }
}

function downsampleWeekly(points: PricePoint[]) {
  const byWeek = new Map<string, PricePoint>()
  for (const point of points) {
    const date = new Date(point.timestamp)
    const key = `${date.getUTCFullYear()}-${Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 1)) / 604800000)}`
    byWeek.set(key, point)
  }
  return [...byWeek.values()]
}

async function fetchFmpHistory(ticker: string, range: RangeKey) {
  const apiKey = process.env.FMP_API_KEY?.trim()
  if (!apiKey) throw new Error("FMP_API_KEY is not configured")
  const settings = fmpSettings(range)
  const to = new Date()
  const from = new Date(to.getTime() - rangeDays(range) * 86_400_000)
  const url = new URL(`https://financialmodelingprep.com/stable/${settings.endpoint}`)
  url.searchParams.set("symbol", ticker)
  url.searchParams.set("from", from.toISOString().slice(0, 10))
  url.searchParams.set("to", to.toISOString().slice(0, 10))
  url.searchParams.set("apikey", apiKey)
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } })
  const raw = await response.text()
  let payload: unknown
  try { payload = JSON.parse(raw) } catch { throw new Error(`FMP returned non-JSON (${response.status})`) }
  if (!response.ok) throw new Error(`FMP request failed (${response.status})`)
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "Error Message" in payload) {
    throw new Error(String((payload as Record<string, unknown>)["Error Message"]))
  }
  const rows = Array.isArray(payload) ? payload : []
  let points: PricePoint[] = rows.flatMap((row: any) => {
    const close = Number(row.close ?? row.price)
    const dateValue = row.date ?? row.timestamp
    if (!Number.isFinite(close) || !dateValue) return []
    const rawDate = String(dateValue)
    const normalizedDate = rawDate.includes("T")
      ? rawDate
      : rawDate.includes(" ")
        ? `${rawDate.replace(" ", "T")}Z`
        : `${rawDate}T00:00:00Z`
    const parsedDate = typeof dateValue === "number" ? new Date(dateValue * 1000) : new Date(normalizedDate)
    if (!Number.isFinite(parsedDate.getTime())) return []
    const timestamp = parsedDate.toISOString()
    return [{ timestamp, close, volume: Number(row.volume) || 0 }]
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  if (range === "3Y" || range === "5Y") points = downsampleWeekly(points)
  if (points.length < 2) throw new Error("FMP returned fewer than two valid price points")
  return { points, interval: settings.interval, intervalLabel: settings.label, currency: "USD", timezone: null as string | null }
}

async function fetchYahooHistory(ticker: string, range: RangeKey) {
  const settings = yahooSettings(range)
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`)
  url.searchParams.set("range", settings.yahooRange)
  url.searchParams.set("interval", settings.interval)
  url.searchParams.set("includePrePost", "false")
  url.searchParams.set("events", "div,splits")
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DIOS-Fund-Manager/1.0)" } })
  const payload = await response.json()
  const providerError = payload?.chart?.error
  if (!response.ok || providerError) throw new Error(providerError?.description || `Yahoo Finance request failed (${response.status})`)
  const result = payload?.chart?.result?.[0]
  if (!result) throw new Error("Yahoo Finance returned no chart result")
  const timestamps: number[] = result.timestamp ?? []
  const closes: Array<number | null> = result.indicators?.quote?.[0]?.close ?? []
  const volumes: Array<number | null> = result.indicators?.quote?.[0]?.volume ?? []
  const adjusted: Array<number | null> = result.indicators?.adjclose?.[0]?.adjclose ?? []
  const points: PricePoint[] = timestamps.flatMap((timestamp, index) => {
    const close = Number((range === "3Y" || range === "5Y" ? adjusted[index] ?? closes[index] : closes[index]))
    return Number.isFinite(close) ? [{ timestamp: new Date(timestamp * 1000).toISOString(), close, volume: Number(volumes[index]) || 0 }] : []
  })
  if (points.length < 2) throw new Error("Yahoo Finance returned fewer than two valid price points")
  return { points, interval: settings.interval, intervalLabel: settings.label, currency: result.meta?.currency ?? "USD", timezone: result.meta?.exchangeTimezoneName ?? null }
}

export async function GET(request: NextRequest) {
  const ticker = normalizeTicker(request.nextUrl.searchParams.get("ticker") ?? "")
  const range = (request.nextUrl.searchParams.get("range") ?? "1M").toUpperCase() as RangeKey
  if (!ticker) return NextResponse.json({ error: "Provide a ticker." }, { status: 400 })
  if (!VALID_RANGES.has(range)) return NextResponse.json({ error: "Range must be 1D, 5D, 1M, 3M, 6M, 1Y, 3Y or 5Y." }, { status: 400 })

  let result: Awaited<ReturnType<typeof fetchFmpHistory>>
  let provider = "Financial Modeling Prep (Starter)"
  let fallbackUsed = false
  let warning: string | null = null
  try {
    result = await fetchFmpHistory(ticker, range)
  } catch (fmpError) {
    fallbackUsed = true
    warning = `FMP unavailable: ${fmpError instanceof Error ? fmpError.message : "unknown error"}`
    provider = "Yahoo Finance (Fallback)"
    try {
      result = await fetchYahooHistory(ticker, range)
    } catch (yahooError) {
      return NextResponse.json({ error: `Unable to retrieve historical prices. ${warning}. Yahoo: ${yahooError instanceof Error ? yahooError.message : "unknown error"}` }, { status: 502 })
    }
  }

  const first = result.points[0].close
  const last = result.points[result.points.length - 1].close
  const change = last - first
  return NextResponse.json({
    ticker, range, interval: result.interval, intervalLabel: result.intervalLabel,
    fallbackUsed, warning, currency: result.currency, timezone: result.timezone,
    points: result.points,
    summary: { first, last, change, changePercent: first ? (change / first) * 100 : 0, high: Math.max(...result.points.map((p) => p.close)), low: Math.min(...result.points.map((p) => p.close)) },
    provider, refreshedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } })
}
