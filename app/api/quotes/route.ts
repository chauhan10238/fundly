import { NextRequest, NextResponse } from "next/server"
import { resolveLiveQuote } from "@/lib/dios/server-market"

export const dynamic = "force-dynamic"
const MAX_SYMBOLS = 200
const CONCURRENCY = 8

function normalize(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

async function mapWithConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>) {
  const output = new Array<R>(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor++
      output[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run))
  return output
}

export async function GET(request: NextRequest) {
  const symbols = Array.from(new Set((request.nextUrl.searchParams.get("symbols") ?? "").split(",").map(normalize).filter(Boolean)))
  if (!symbols.length) return NextResponse.json({ error: "Provide symbols." }, { status: 400 })
  if (symbols.length > MAX_SYMBOLS) return NextResponse.json({ error: `Maximum ${MAX_SYMBOLS} symbols.` }, { status: 400 })

  const results = await mapWithConcurrency(symbols, async (symbol) => {
    try { return { symbol, value: await resolveLiveQuote(symbol, process.env.FMP_API_KEY) } }
    catch { return { symbol, value: null } }
  })

  const quotes: any[] = []
  const unavailable: string[] = []
  for (const result of results) {
    if (result.value) {
      const s = result.value.snapshot
      quotes.push({
        symbol: result.symbol,
        name: result.value.name,
        price: s.price,
        previousClose: s.previousClose,
        change: s.price - s.previousClose,
        changePercent: s.changePercent,
        timestamp: Math.floor(Date.now() / 1000),
        provider: s.provider,
      })
    } else unavailable.push(result.symbol)
  }

  if (!quotes.length) return NextResponse.json({ error: "No current quotes returned.", unavailable }, { status: 502 })
  return NextResponse.json(
    { quotes, unavailable, provider: "Financial Modeling Prep (Primary) / Yahoo Finance (Fallback)", refreshedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  )
}
