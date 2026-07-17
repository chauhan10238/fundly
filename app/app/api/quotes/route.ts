import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type RawQuote = {
  symbol?: string
  name?: string
  price?: number
  change?: number
  changesPercentage?: number
  changePercentage?: number
  previousClose?: number
  timestamp?: number
}

type NormalizedQuote = {
  symbol: string
  name: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  timestamp: number | null
}

const MAX_SYMBOLS = 25

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "")
}

function normalizeQuote(symbol: string, quote: RawQuote): NormalizedQuote | null {
  if (typeof quote.price !== "number" || !Number.isFinite(quote.price) || quote.price <= 0) {
    return null
  }

  const previousClose =
    typeof quote.previousClose === "number" && Number.isFinite(quote.previousClose)
      ? quote.previousClose
      : typeof quote.change === "number"
        ? quote.price - quote.change
        : quote.price

  const change =
    typeof quote.change === "number" && Number.isFinite(quote.change)
      ? quote.change
      : quote.price - previousClose

  const changePercentRaw = quote.changesPercentage ?? quote.changePercentage
  const changePercent =
    typeof changePercentRaw === "number" && Number.isFinite(changePercentRaw)
      ? changePercentRaw
      : previousClose
        ? (change / previousClose) * 100
        : 0

  return {
    symbol,
    name: quote.name?.trim() || symbol,
    price: quote.price,
    previousClose,
    change,
    changePercent,
    timestamp: typeof quote.timestamp === "number" ? quote.timestamp : null,
  }
}

async function fetchFmpQuote(symbol: string, apiKey: string): Promise<NormalizedQuote | null> {
  // FMP's current stable endpoint. A legacy fallback is included to make the
  // integration more resilient across account tiers and API migrations.
  const endpoints = [
    `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
    `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${encodeURIComponent(apiKey)}`,
  ]

  let lastError: Error | null = null

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })

      if (!response.ok) {
        lastError = new Error(`FMP returned ${response.status} for ${symbol}`)
        continue
      }

      const payload = await response.json()
      const rows: RawQuote[] = Array.isArray(payload) ? payload : payload ? [payload] : []
      const row = rows.find((item) => normalizeSymbol(item.symbol ?? "") === symbol) ?? rows[0]
      if (!row) continue

      const normalized = normalizeQuote(symbol, row)
      if (normalized) return normalized
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown FMP response error")
    }
  }

  if (lastError) throw lastError
  return null
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "FMP_API_KEY is not configured in Vercel environment variables.",
        code: "MISSING_API_KEY",
      },
      { status: 500 },
    )
  }

  const symbols = Array.from(
    new Set(
      (request.nextUrl.searchParams.get("symbols") ?? "")
        .split(",")
        .map(normalizeSymbol)
        .filter(Boolean),
    ),
  )

  if (symbols.length === 0) {
    return NextResponse.json({ error: "Provide at least one ticker in the symbols query parameter." }, { status: 400 })
  }

  if (symbols.length > MAX_SYMBOLS) {
    return NextResponse.json({ error: `A maximum of ${MAX_SYMBOLS} tickers is allowed per request.` }, { status: 400 })
  }

  const settled = await Promise.allSettled(symbols.map((symbol) => fetchFmpQuote(symbol, apiKey)))
  const quotes: NormalizedQuote[] = []
  const unavailable: string[] = []

  settled.forEach((result, index) => {
    const symbol = symbols[index]
    if (result.status === "fulfilled" && result.value) quotes.push(result.value)
    else unavailable.push(symbol)
  })

  if (quotes.length === 0) {
    return NextResponse.json(
      {
        error: "No verified quotes were returned. Check the FMP key, plan permissions and ticker symbols.",
        code: "NO_QUOTES",
        unavailable,
      },
      { status: 502 },
    )
  }

  return NextResponse.json(
    {
      quotes,
      unavailable,
      provider: "Financial Modeling Prep",
      refreshedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  )
}
