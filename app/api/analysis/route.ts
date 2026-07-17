import { NextRequest, NextResponse } from "next/server"
import { getInstrument } from "@/lib/dios/universe"

export const dynamic = "force-dynamic"

type RawQuote = {
  symbol?: string
  price?: number
  change?: number
  changesPercentage?: number
  changePercentage?: number
  previousClose?: number
}

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "")
}

async function fetchQuote(ticker: string, apiKey: string) {
  const endpoints = [
    `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(apiKey)}`,
    `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(ticker)}?apikey=${encodeURIComponent(apiKey)}`,
  ]

  for (const url of endpoints) {
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } })
    if (!response.ok) continue
    const payload = await response.json()
    const rows: RawQuote[] = Array.isArray(payload) ? payload : payload ? [payload] : []
    const quote = rows[0]
    if (!quote || typeof quote.price !== "number" || quote.price <= 0) continue

    const previousClose =
      typeof quote.previousClose === "number"
        ? quote.previousClose
        : typeof quote.change === "number"
          ? quote.price - quote.change
          : quote.price
    const changePercentRaw = quote.changesPercentage ?? quote.changePercentage
    const changePercent =
      typeof changePercentRaw === "number"
        ? changePercentRaw
        : previousClose
          ? ((quote.price - previousClose) / previousClose) * 100
          : 0

    return { price: quote.price, previousClose, changePercent }
  }

  return null
}

export async function GET(request: NextRequest) {
  const ticker = normalizeTicker(request.nextUrl.searchParams.get("ticker") ?? "")
  if (!ticker) return NextResponse.json({ error: "Provide a ticker." }, { status: 400 })

  const instrument = getInstrument(ticker)
  if (!instrument) {
    return NextResponse.json(
      { error: `${ticker} is not yet in the DIOS tracked universe.` },
      { status: 404 },
    )
  }

  const refreshedAt = new Date().toISOString()
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      ticker,
      snapshot: {
        price: instrument.price,
        previousClose: instrument.prevClose,
        changePercent: instrument.prevClose ? ((instrument.price - instrument.prevClose) / instrument.prevClose) * 100 : 0,
        refreshedAt,
        provider: "DIOS model fallback",
        isLive: false,
      },
      warning: "FMP_API_KEY is not configured; model fallback price used.",
    })
  }

  try {
    const quote = await fetchQuote(ticker, apiKey)
    if (!quote) throw new Error("No live quote returned")
    return NextResponse.json({
      ticker,
      snapshot: { ...quote, refreshedAt, provider: "Financial Modeling Prep", isLive: true },
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } })
  } catch {
    return NextResponse.json({
      ticker,
      snapshot: {
        price: instrument.price,
        previousClose: instrument.prevClose,
        changePercent: instrument.prevClose ? ((instrument.price - instrument.prevClose) / instrument.prevClose) * 100 : 0,
        refreshedAt,
        provider: "DIOS model fallback",
        isLive: false,
      },
      warning: "Live quote unavailable; model fallback price used.",
    })
  }
}
