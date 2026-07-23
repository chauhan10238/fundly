import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RangeKey = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y"

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string
        regularMarketPrice?: number
        previousClose?: number
        chartPreviousClose?: number
        dataGranularity?: string
        exchangeTimezoneName?: string
      }
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
          volume?: Array<number | null>
        }>
        adjclose?: Array<{
          adjclose?: Array<number | null>
        }>
      }
    }>
    error?: {
      code?: string
      description?: string
    } | null
  }
}

type PricePoint = {
  timestamp: string
  close: number
  volume: number
}

const VALID_RANGES = new Set<RangeKey>([
  "1D",
  "5D",
  "1M",
  "3M",
  "6M",
  "1Y",
  "3Y",
  "5Y",
])

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

function yahooSettings(range: RangeKey) {
  switch (range) {
    case "1D":
      return { yahooRange: "1d", interval: "5m", label: "5-minute" }
    case "5D":
      return { yahooRange: "5d", interval: "15m", label: "15-minute" }
    case "1M":
      return { yahooRange: "1mo", interval: "1h", label: "hourly" }
    case "3M":
      return { yahooRange: "3mo", interval: "1d", label: "daily" }
    case "6M":
      return { yahooRange: "6mo", interval: "1d", label: "daily" }
    case "1Y":
      return { yahooRange: "1y", interval: "1d", label: "daily" }
    case "3Y":
      return { yahooRange: "3y", interval: "1wk", label: "weekly" }
    case "5Y":
      return { yahooRange: "5y", interval: "1wk", label: "weekly" }
  }
}

async function fetchYahooHistory(ticker: string, range: RangeKey) {
  const settings = yahooSettings(range)
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
  )

  url.searchParams.set("range", settings.yahooRange)
  url.searchParams.set("interval", settings.interval)
  url.searchParams.set("includePrePost", "false")
  url.searchParams.set("events", "div,splits")

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; DIOS-Fund-Manager/1.0; +https://vercel.app)",
    },
  })

  const raw = await response.text()

  let payload: YahooChartResponse

  try {
    payload = JSON.parse(raw) as YahooChartResponse
  } catch {
    const preview = raw.replace(/\s+/g, " ").slice(0, 160)
    throw new Error(
      `Yahoo Finance returned a non-JSON response (${response.status}). ${preview}`,
    )
  }

  const providerError = payload.chart?.error

  if (!response.ok || providerError) {
    throw new Error(
      providerError?.description ||
        providerError?.code ||
        `Yahoo Finance request failed (${response.status})`,
    )
  }

  const result = payload.chart?.result?.[0]

  if (!result) {
    throw new Error("Yahoo Finance returned no chart result.")
  }

  const timestamps = result.timestamp ?? []
  const quote = result.indicators?.quote?.[0]
  const closes = quote?.close ?? []
  const volumes = quote?.volume ?? []
  const adjusted = result.indicators?.adjclose?.[0]?.adjclose ?? []

  const points: PricePoint[] = []

  for (let index = 0; index < timestamps.length; index += 1) {
    const rawClose =
      range === "3Y" || range === "5Y"
        ? adjusted[index] ?? closes[index]
        : closes[index]

    const close = Number(rawClose)

    if (!Number.isFinite(close)) continue

    points.push({
      timestamp: new Date(timestamps[index] * 1000).toISOString(),
      close,
      volume: Number(volumes[index]) || 0,
    })
  }

  if (points.length < 2) {
    throw new Error("Not enough valid price points were returned.")
  }

  return {
    points,
    interval: settings.interval,
    intervalLabel: settings.label,
    currency: result.meta?.currency ?? "USD",
    timezone: result.meta?.exchangeTimezoneName ?? null,
  }
}

export async function GET(request: NextRequest) {
  const ticker = normalizeTicker(
    request.nextUrl.searchParams.get("ticker") ?? "",
  )
  const range = (
    request.nextUrl.searchParams.get("range") ?? "1M"
  ).toUpperCase() as RangeKey

  if (!ticker) {
    return NextResponse.json({ error: "Provide a ticker." }, { status: 400 })
  }

  if (!VALID_RANGES.has(range)) {
    return NextResponse.json(
      {
        error:
          "Range must be 1D, 5D, 1M, 3M, 6M, 1Y, 3Y or 5Y.",
      },
      { status: 400 },
    )
  }

  try {
    const result = await fetchYahooHistory(ticker, range)
    const first = result.points[0].close
    const last = result.points[result.points.length - 1].close
    const change = last - first

    return NextResponse.json(
      {
        ticker,
        range,
        interval: result.interval,
        intervalLabel: result.intervalLabel,
        fallbackUsed: false,
        warning: null,
        currency: result.currency,
        timezone: result.timezone,
        points: result.points,
        summary: {
          first,
          last,
          change,
          changePercent: first ? (change / first) * 100 : 0,
          high: Math.max(...result.points.map((point) => point.close)),
          low: Math.min(...result.points.map((point) => point.close)),
        },
        provider: "Yahoo Finance",
        refreshedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("DIOS Yahoo history API failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve historical prices.",
      },
      { status: 502 },
    )
  }
}
