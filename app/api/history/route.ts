import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RangeKey = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y"
type PricePoint = { timestamp: string; close: number; volume: number }
type HistoryResult = { points: PricePoint[]; interval: string; intervalLabel: string; currency: string; timezone: string | null; provider: string }

const VALID_RANGES = new Set<RangeKey>(["1D", "5D", "1M", "3M", "6M", "1Y", "3Y", "5Y"])

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

function isoDate(date: Date) { return date.toISOString().slice(0, 10) }

function rangeDates(range: RangeKey) {
  const to = new Date()
  const from = new Date(to)
  const days = range === "3M" ? 100 : range === "6M" ? 190 : range === "1Y" ? 370 : range === "3Y" ? 1100 : 1850
  from.setUTCDate(from.getUTCDate() - days)
  return { from: isoDate(from), to: isoDate(to) }
}

function fmpSettings(range: RangeKey) {
  if (range === "1D") return { endpoint: "historical-chart/5min", interval: "5min", label: "5-minute", intraday: true }
  if (range === "5D") return { endpoint: "historical-chart/15min", interval: "15min", label: "15-minute", intraday: true }
  if (range === "1M") return { endpoint: "historical-chart/1hour", interval: "1hour", label: "hourly", intraday: true }
  return { endpoint: "historical-price-eod/full", interval: "1day", label: "daily", intraday: false }
}

async function fetchFmpHistory(ticker: string, range: RangeKey): Promise<HistoryResult> {
  const apiKey = process.env.FMP_API_KEY?.trim()
  if (!apiKey) throw new Error("FMP_API_KEY is not configured")
  const settings = fmpSettings(range)
  const url = new URL(`https://financialmodelingprep.com/stable/${settings.endpoint}`)
  url.searchParams.set("symbol", ticker)
  url.searchParams.set("apikey", apiKey)
  if (!settings.intraday) {
    const dates = rangeDates(range)
    url.searchParams.set("from", dates.from)
    url.searchParams.set("to", dates.to)
  }
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } })
  const raw = await response.text()
  let payload: any
  try { payload = JSON.parse(raw) } catch { throw new Error(`FMP returned a non-JSON response (${response.status})`) }
  if (!response.ok) throw new Error(payload?.message || payload?.error || `FMP request failed (${response.status})`)
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.historical) ? payload.historical : []
  const points = rows.map((row: any) => {
    const stamp = row.date ?? row.datetime ?? row.timestamp
    const date = typeof stamp === "number" ? new Date(stamp * 1000) : new Date(String(stamp ?? ""))
    return { timestamp: date.toISOString(), close: Number(row.close ?? row.price), volume: Number(row.volume) || 0 }
  }).filter((point: PricePoint) => Number.isFinite(point.close) && point.close > 0)
    .sort((a: PricePoint, b: PricePoint) => a.timestamp.localeCompare(b.timestamp))
  if (points.length < 2) throw new Error("FMP returned insufficient historical price data")
  return { points, interval: settings.interval, intervalLabel: settings.label, currency: "USD", timezone: "America/New_York", provider: "Financial Modeling Prep (Starter)" }
}

type YahooChartResponse = { chart?: { result?: Array<{ meta?: { currency?: string; exchangeTimezoneName?: string }; timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null>; volume?: Array<number | null> }>; adjclose?: Array<{ adjclose?: Array<number | null> }> } }>; error?: { code?: string; description?: string } | null } }
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
async function fetchYahooHistory(ticker: string, range: RangeKey): Promise<HistoryResult> {
  const settings = yahooSettings(range)
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`)
  url.searchParams.set("range", settings.yahooRange); url.searchParams.set("interval", settings.interval); url.searchParams.set("includePrePost", "false"); url.searchParams.set("events", "div,splits")
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 DIOS/4.1" } })
  const payload = await response.json() as YahooChartResponse
  const providerError = payload.chart?.error
  if (!response.ok || providerError) throw new Error(providerError?.description || `Yahoo request failed (${response.status})`)
  const result = payload.chart?.result?.[0]
  if (!result) throw new Error("Yahoo returned no chart result")
  const timestamps = result.timestamp ?? []; const quote = result.indicators?.quote?.[0]; const closes = quote?.close ?? []; const volumes = quote?.volume ?? []; const adjusted = result.indicators?.adjclose?.[0]?.adjclose ?? []
  const points: PricePoint[] = []
  for (let i=0;i<timestamps.length;i++) { const close=Number((range === "3Y" || range === "5Y") ? adjusted[i] ?? closes[i] : closes[i]); if (Number.isFinite(close)) points.push({timestamp:new Date(timestamps[i]*1000).toISOString(),close,volume:Number(volumes[i])||0}) }
  if (points.length < 2) throw new Error("Yahoo returned insufficient historical data")
  return { points, interval: settings.interval, intervalLabel: settings.label, currency: result.meta?.currency ?? "USD", timezone: result.meta?.exchangeTimezoneName ?? null, provider: "Yahoo Finance (Fallback)" }
}

export async function GET(request: NextRequest) {
  const ticker = normalizeTicker(request.nextUrl.searchParams.get("ticker") ?? "")
  const range = (request.nextUrl.searchParams.get("range") ?? "1M").toUpperCase() as RangeKey
  if (!ticker) return NextResponse.json({ error: "Provide a ticker." }, { status: 400 })
  if (!VALID_RANGES.has(range)) return NextResponse.json({ error: "Invalid range." }, { status: 400 })
  let result: HistoryResult; let fallbackUsed=false; let warning: string | null=null
  try { result = await fetchFmpHistory(ticker, range) }
  catch (fmpError) {
    warning = `FMP unavailable: ${fmpError instanceof Error ? fmpError.message : "Unknown error"}. Yahoo fallback used.`
    console.warn("[Market History]", { ticker, provider: "Yahoo Finance", fallback: true, reason: warning })
    try { result = await fetchYahooHistory(ticker, range); fallbackUsed=true }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to retrieve historical prices." }, { status: 502 }) }
  }
  const first=result.points[0].close,last=result.points[result.points.length-1].close,change=last-first
  console.info("[Market History]", { ticker, provider: result.provider, fallback: fallbackUsed, points: result.points.length })
  return NextResponse.json({ ticker, range, interval: result.interval, intervalLabel: result.intervalLabel, fallbackUsed, warning, currency: result.currency, timezone: result.timezone, points: result.points, summary: { first,last,change,changePercent:first?(change/first)*100:0,high:Math.max(...result.points.map(p=>p.close)),low:Math.min(...result.points.map(p=>p.close)) }, provider: result.provider, refreshedAt:new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store, max-age=0" } })
}
