import { NextRequest, NextResponse } from "next/server"
import { resolveLiveQuote } from "@/lib/dios/server-market"

export const dynamic = "force-dynamic"
const MAX_SYMBOLS = 25

function normalize(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

export async function GET(request: NextRequest) {
  const symbols = Array.from(new Set((request.nextUrl.searchParams.get("symbols") ?? "").split(",").map(normalize).filter(Boolean)))
  if (!symbols.length) return NextResponse.json({ error: "Provide symbols." }, { status: 400 })
  if (symbols.length > MAX_SYMBOLS) return NextResponse.json({ error: `Maximum ${MAX_SYMBOLS} symbols.` }, { status: 400 })

  const settled = await Promise.allSettled(symbols.map((symbol) => resolveLiveQuote(symbol, process.env.FMP_API_KEY)))
  const quotes: any[] = []
  const unavailable: string[] = []
  settled.forEach((result, index) => {
    const symbol = symbols[index]
    if (result.status === "fulfilled" && result.value) {
      const s = result.value.snapshot
      quotes.push({
        symbol,
        name: result.value.name,
        price: s.price,
        previousClose: s.previousClose,
        change: s.price - s.previousClose,
        changePercent: s.changePercent,
        timestamp: Math.floor(Date.now() / 1000),
        provider: s.provider,
      })
    } else unavailable.push(symbol)
  })

  if (!quotes.length) return NextResponse.json({ error: "No current quotes returned.", unavailable }, { status: 502 })
  return NextResponse.json({ quotes, unavailable, provider: "Yahoo Finance / FMP", refreshedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } })
}
