import { getFmpApiKey } from "@/lib/data-providers/fmp"

export type HistoricalPoint = { date: string; close: number }

export function cleanMarketTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

export function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function rowsFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === "object") {
    const object = payload as { historical?: unknown; data?: unknown }
    if (Array.isArray(object.historical)) return object.historical
    if (Array.isArray(object.data)) return object.data
  }
  return []
}

export function firstOnOrAfter(points: HistoricalPoint[], target: Date) {
  const targetDate = dateOnly(target)
  return points.find((point) => point.date >= targetDate) ?? null
}

export function lastOnOrBefore(points: HistoricalPoint[], target: Date) {
  const targetDate = dateOnly(target)
  return [...points].reverse().find((point) => point.date <= targetDate) ?? null
}

async function fetchFmpHistory(ticker: string, from: string, to: string): Promise<HistoricalPoint[]> {
  const apiKey = getFmpApiKey()
  if (!apiKey) throw new Error("FMP_API_KEY is not configured")

  const url = new URL("https://financialmodelingprep.com/stable/historical-price-eod/full")
  url.searchParams.set("symbol", ticker)
  url.searchParams.set("from", from)
  url.searchParams.set("to", to)
  url.searchParams.set("apikey", apiKey)

  const response = await fetch(url, {
    cache: "force-cache",
    next: { revalidate: 21_600 },
    headers: { Accept: "application/json" },
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(`FMP request failed (${response.status})`)

  return rowsFromPayload(payload)
    .flatMap((row) => {
      if (!row || typeof row !== "object") return []
      const object = row as Record<string, unknown>
      const close = Number(object.close ?? object.adjClose ?? object.price)
      const date = String(object.date ?? "").slice(0, 10)
      return date && Number.isFinite(close) && close > 0 ? [{ date, close }] : []
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function fetchYahooHistory(ticker: string, start: Date, end: Date): Promise<HistoricalPoint[]> {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`)
  url.searchParams.set("period1", String(Math.floor(start.getTime() / 1000)))
  url.searchParams.set("period2", String(Math.ceil(end.getTime() / 1000)))
  url.searchParams.set("interval", "1d")
  url.searchParams.set("events", "div,splits")

  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Fundly/2.1)" },
  })
  const payload = await response.json()
  const result = payload?.chart?.result?.[0]
  if (!response.ok || !result) {
    throw new Error(payload?.chart?.error?.description ?? `Yahoo request failed (${response.status})`)
  }

  const timestamps: number[] = result.timestamp ?? []
  const closes: Array<number | null> =
    result.indicators?.adjclose?.[0]?.adjclose ??
    result.indicators?.quote?.[0]?.close ??
    []

  return timestamps
    .flatMap((timestamp, index) => {
      const close = Number(closes[index])
      return Number.isFinite(close) && close > 0
        ? [{ date: dateOnly(new Date(timestamp * 1000)), close }]
        : []
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getHistoricalSeries(tickerInput: string, start: Date, end: Date) {
  const ticker = cleanMarketTicker(tickerInput)
  if (!ticker) throw new Error("Invalid ticker")

  try {
    const points = await fetchFmpHistory(ticker, dateOnly(start), dateOnly(end))
    if (!points.length) throw new Error("FMP returned no historical prices")
    return { points, provider: "Financial Modeling Prep (Starter)" }
  } catch (fmpError) {
    const points = await fetchYahooHistory(ticker, start, end)
    if (!points.length) {
      throw new Error(
        `FMP and Yahoo history unavailable: ${fmpError instanceof Error ? fmpError.message : "unknown FMP error"}`,
      )
    }
    return { points, provider: "Yahoo Finance (Fallback)" }
  }
}
