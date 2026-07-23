import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RangeKey = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y"

type PricePoint = {
  timestamp: string
  close: number
  volume: number
}

type FmpRow = {
  date?: string
  datetime?: string
  close?: number
  price?: number
  volume?: number
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

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function rangeStart(range: RangeKey) {
  const end = new Date()
  const start = new Date(end)

  if (range === "1D") start.setDate(start.getDate() - 2)
  if (range === "5D") start.setDate(start.getDate() - 8)
  if (range === "1M") start.setMonth(start.getMonth() - 1)
  if (range === "3M") start.setMonth(start.getMonth() - 3)
  if (range === "6M") start.setMonth(start.getMonth() - 6)
  if (range === "1Y") start.setFullYear(start.getFullYear() - 1)
  if (range === "3Y") start.setFullYear(start.getFullYear() - 3)
  if (range === "5Y") start.setFullYear(start.getFullYear() - 5)

  return { start, end }
}

function requestedInterval(range: RangeKey) {
  if (range === "1D") return "5min"
  if (range === "5D") return "15min"
  if (range === "1M") return "1hour"
  if (range === "3M" || range === "6M" || range === "1Y") return "1day"
  return "1week"
}

function normaliseRows(rows: FmpRow[]): PricePoint[] {
  return rows
    .map((row) => {
      const timestamp = row.datetime ?? row.date
      const close = Number(row.close ?? row.price)

      if (!timestamp || !Number.isFinite(close)) return null

      return {
        timestamp,
        close,
        volume: Number(row.volume) || 0,
      }
    })
    .filter((point): point is PricePoint => point !== null)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
}

function sampleByPeriod(points: PricePoint[], period: "day" | "week") {
  const sampled = new Map<string, PricePoint>()

  for (const point of points) {
    const date = new Date(point.timestamp)
    if (Number.isNaN(date.getTime())) continue

    if (period === "day") {
      sampled.set(date.toISOString().slice(0, 10), point)
      continue
    }

    const year = date.getUTCFullYear()
    const firstDay = new Date(Date.UTC(year, 0, 1))
    const dayOfYear = Math.floor(
      (date.getTime() - firstDay.getTime()) / 86_400_000,
    )
    sampled.set(`${year}-${Math.floor(dayOfYear / 7)}`, point)
  }

  return Array.from(sampled.values())
}

async function readFmp(url: URL) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })

  const raw = await response.text()
  const contentType = response.headers.get("content-type") ?? ""

  if (!contentType.includes("application/json")) {
    throw new Error(
      raw.trim().startsWith("Restricted")
        ? "This intraday interval is restricted by the current FMP plan."
        : `Market-data provider returned a non-JSON response (${response.status}).`,
    )
  }

  let payload: unknown

  try {
    payload = JSON.parse(raw)
  } catch {
    throw new Error("Market-data provider returned invalid JSON.")
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Historical price request failed (${response.status})`

    throw new Error(message)
  }

  if (!Array.isArray(payload)) {
    throw new Error("Historical price data was unavailable.")
  }

  return payload as FmpRow[]
}

function buildUrl(
  endpoint: string,
  ticker: string,
  start: Date,
  end: Date,
  apiKey: string,
) {
  const url = new URL(endpoint)
  url.searchParams.set("symbol", ticker)
  url.searchParams.set("from", isoDate(start))
  url.searchParams.set("to", isoDate(end))
  url.searchParams.set("apikey", apiKey)
  return url
}

async function fetchHistory(
  ticker: string,
  range: RangeKey,
  apiKey: string,
): Promise<{
  points: PricePoint[]
  interval: string
  fallbackUsed: boolean
  warning?: string
}> {
  const { start, end } = rangeStart(range)
  const interval = requestedInterval(range)

  if (interval === "5min" || interval === "15min" || interval === "1hour") {
    const intradayUrl = buildUrl(
      `https://financialmodelingprep.com/stable/historical-chart/${interval}`,
      ticker,
      start,
      end,
      apiKey,
    )

    try {
      const intradayRows = await readFmp(intradayUrl)
      const points = normaliseRows(intradayRows)

      if (points.length >= 2) {
        return {
          points,
          interval,
          fallbackUsed: false,
        }
      }
    } catch (error) {
      const eodUrl = buildUrl(
        "https://financialmodelingprep.com/stable/historical-price-eod/light",
        ticker,
        start,
        end,
        apiKey,
      )
      const eodRows = await readFmp(eodUrl)
      const points = normaliseRows(eodRows)

      return {
        points,
        interval: "1day",
        fallbackUsed: true,
        warning:
          error instanceof Error
            ? `${error.message} Showing end-of-day data instead.`
            : "Intraday data unavailable. Showing end-of-day data instead.",
      }
    }
  }

  const eodUrl = buildUrl(
    "https://financialmodelingprep.com/stable/historical-price-eod/light",
    ticker,
    start,
    end,
    apiKey,
  )

  const rows = await readFmp(eodUrl)
  let points = normaliseRows(rows)

  if (interval === "1week") {
    points = sampleByPeriod(points, "week")
  }

  return {
    points,
    interval,
    fallbackUsed: false,
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

  const apiKey = process.env.FMP_API_KEY?.trim()

  if (!apiKey) {
    return NextResponse.json(
      { error: "FMP_API_KEY is not configured." },
      { status: 500 },
    )
  }

  try {
    const result = await fetchHistory(ticker, range, apiKey)

    if (result.points.length < 2) {
      return NextResponse.json(
        {
          error:
            range === "1D"
              ? "Not enough intraday or end-of-day prices were returned."
              : "Not enough historical prices were returned.",
        },
        { status: 502 },
      )
    }

    const first = result.points[0].close
    const last = result.points[result.points.length - 1].close
    const change = last - first

    return NextResponse.json(
      {
        ticker,
        range,
        interval: result.interval,
        fallbackUsed: result.fallbackUsed,
        warning: result.warning,
        points: result.points,
        summary: {
          first,
          last,
          change,
          changePercent: first ? (change / first) * 100 : 0,
          high: Math.max(...result.points.map((point) => point.close)),
          low: Math.min(...result.points.map((point) => point.close)),
        },
        provider: "Financial Modeling Prep",
        refreshedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("DIOS history API failed:", error)

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
