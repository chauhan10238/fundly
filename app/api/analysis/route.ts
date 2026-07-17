import { NextRequest, NextResponse } from "next/server"
import { getInstrument } from "@/lib/dios/universe"
import { buildDynamicInstrument, fetchYahooNews, resolveLiveQuote, sourceFromQuote } from "@/lib/dios/server-market"
import type { ExternalAnalysisContext } from "@/lib/dios/types"

export const dynamic = "force-dynamic"

function normalize(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

export async function GET(request: NextRequest) {
  const ticker = normalize(request.nextUrl.searchParams.get("ticker") ?? "")
  if (!ticker) return NextResponse.json({ error: "Provide ticker." }, { status: 400 })

  const resolved = await resolveLiveQuote(ticker, process.env.FMP_API_KEY)
  if (!resolved) {
    return NextResponse.json(
      { error: `No current market quote was returned for ${ticker}. Check the symbol and try again.` },
      { status: 502 },
    )
  }

  const tracked = getInstrument(ticker)
  const instrument = tracked
    ? { ...tracked, name: resolved.name || tracked.name, currency: resolved.currency || tracked.currency, price: resolved.snapshot.price, prevClose: resolved.snapshot.previousClose }
    : buildDynamicInstrument({
        symbol: ticker,
        name: resolved.name,
        type: resolved.type,
        currency: resolved.currency,
        price: resolved.snapshot.price,
        previousClose: resolved.snapshot.previousClose,
      })

  const news = await fetchYahooNews(ticker)
  const retrieved = new Date().toISOString()
  const sources = [sourceFromQuote(resolved.snapshot.provider, ticker, retrieved)]
  news.slice(0, 5).forEach((item, index) => {
    sources.push({
      id: `S${index + 2}`,
      name: `${item.source} — ${item.title}`,
      date: item.publishedAt.slice(0, 10),
      url: item.url,
      retrieved,
    })
  })

  const context: ExternalAnalysisContext = {
    refreshedAt: retrieved,
    news,
    earnings: null,
    fundamentals: {
      companyName: instrument.name,
      sector: instrument.sector,
      industry: instrument.industry,
    },
    etfHoldings: [],
    sources,
    warnings: news.length ? [] : ["Recent ticker-specific news was unavailable; price data is current but news context is limited."],
    instrument,
  }

  return NextResponse.json(
    { snapshot: resolved.snapshot, context },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  )
}
