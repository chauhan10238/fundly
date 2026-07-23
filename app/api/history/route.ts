import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RangeKey = "1D" | "1W" | "1M" | "1Y" | "5Y"

type FmpRow = {
  date?: string
  datetime?: string
  close?: number
  price?: number
  volume?: number
}

const VALID_RANGES = new Set<RangeKey>(["1D", "1W", "1M", "1Y", "5Y"])

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dateRange(range: RangeKey) {
  const end = new Date()
  const start = new Date(end)

  if (range === "1D") start.setDate(start.getDate() - 2)
  if (range === "1W") start.setDate(start.getDate() - 10)
  if (range === "1M") start.setMonth(start.getMonth() - 1)
  if (range === "1Y") start.setFullYear(start.getFullYear() - 1)
  if (range === "5Y") start.setFullYear(start.getFullYear() - 5)

  return { start, end }
}

function sampleWeekly(rows: FmpRow[]) {
  const weekly = new Map<string, FmpRow>()

  for (const row of rows) {
    const raw = row.datetime ?? row.date
    if (!raw) continue

    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) continue

    const year = date.getUTCFullYear()
    const firstDay = new Date(Date.UTC(year, 0, 1))
    const day = Math.floor((date.getTime() - firstDay.getTime()) / 86_400_000)
    const week = Math.floor(day / 7)

    weekly.set(`${year}-${week}`, row)
  }

  return Array.from(weekly.values())
}

function normaliseRows(rows: FmpRow[], range: RangeKey) {
  const ordered = [...rows].sort((a, b) => {
    const aDate = new Date(a.datetime ?? a.date ?? 0).getTime()
    const bDate = new Date(b.datetime ?? b.date ?? 0).getTime()
    return aDate - bDate
  })

  const sampled = range === "5Y" ? sampleWeekly(ordered) : ordered

  return sampled
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
    .filter(
      (
        point,
      ): point is { timestamp: string; close: number; volume: number } =>
        point !== null,
    )
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
      { error: "Range must be 1D, 1W, 1M, 1Y or 5Y." },
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

  const { start, end } = dateRange(range)

  const endpoint =
    range === "1D"
      ? "https://financialmodelingprep.com/stable/historical-chart/5min"
      : "https://financialmodelingprep.com/stable/historical-price-eod/light"

  const url = new URL(endpoint)
  url.searchParams.set("symbol", ticker)
  url.searchParams.set("from", formatDate(start))
  url.searchParams.set("to", formatDate(end))
  url.searchParams.set("apikey", apiKey)

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })

    const payload = (await response.json()) as FmpRow[] | { error?: string }

    if (!response.ok) {
      throw new Error(
        !Array.isArray(payload) && payload.error
          ? payload.error
          : `Historical price request failed (${response.status})`,
      )
    }

    if (!Array.isArray(payload)) {
      throw new Error(
        payload.error || "Historical price data was unavailable.",
      )
    }

    const points = normaliseRows(payload, range)

    if (points.length < 2) {
      return NextResponse.json(
        {
          error:
            range === "1D"
              ? "Intraday history is unavailable for this ticker or FMP plan."
              : "Not enough historical prices were returned.",
        },
        { status: 502 },
      )
    }

    const first = points[0].close
    const last = points[points.length - 1].close
    const change = last - first

    return NextResponse.json(
      {
        ticker,
        range,
        points,
        summary: {
          first,
          last,
          change,
          changePercent: first ? (change / first) * 100 : 0,
          high: Math.max(...points.map((point) => point.close)),
          low: Math.min(...points.map((point) => point.close)),
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
