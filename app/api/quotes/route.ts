import { NextRequest, NextResponse } from "next/server"
import { getFmpApiKey, getFmpBatchQuotes } from "@/lib/data-providers/fmp"
import { fetchYahooQuote } from "@/lib/dios/server-market"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
const MAX_SYMBOLS = 200
const FALLBACK_CONCURRENCY = 2

function normalize(value: string) { return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "") }

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const output = new Array<R>(items.length); let cursor = 0
  async function run() { while (cursor < items.length) { const index = cursor++; output[index] = await worker(items[index]) } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run)); return output
}

export async function GET(request: NextRequest) {
  const symbols = Array.from(new Set((request.nextUrl.searchParams.get("symbols") ?? "").split(",").map(normalize).filter(Boolean)))
  if (!symbols.length) return NextResponse.json({ error: "Provide symbols." }, { status: 400 })
  if (symbols.length > MAX_SYMBOLS) return NextResponse.json({ error: `Maximum ${MAX_SYMBOLS} symbols.` }, { status: 400 })

  const fmp = getFmpApiKey() ? await getFmpBatchQuotes(symbols) : null
  const fmpMap = new Map((fmp?.ok ? fmp.data : []).map((q) => [q.symbol, q]))
  const missing = symbols.filter((symbol) => !fmpMap.has(symbol))
  const yahoo = await mapWithConcurrency(missing, FALLBACK_CONCURRENCY, async (symbol) => {
    try { return { symbol, value: await fetchYahooQuote(symbol) } } catch { return { symbol, value: null } }
  })
  const yahooMap = new Map(yahoo.filter((x) => x.value).map((x) => [x.symbol, x.value!]))

  const quotes: any[] = []; const unavailable: string[] = []
  for (const symbol of symbols) {
    const fq = fmpMap.get(symbol)
    if (fq) {
      const previousClose = fq.previousClose ?? fq.price
      quotes.push({ symbol, name: symbol, price: fq.price, previousClose, change: fq.change ?? fq.price - previousClose, changePercent: fq.changePercent ?? (previousClose ? ((fq.price - previousClose) / previousClose) * 100 : 0), timestamp: Math.floor(Date.now() / 1000), provider: "Financial Modeling Prep (Batch)" })
      continue
    }
    const y = yahooMap.get(symbol)
    if (y) {
      const s = y.snapshot
      quotes.push({ symbol, name: y.name, price: s.price, previousClose: s.previousClose, change: s.price - s.previousClose, changePercent: s.changePercent, timestamp: Math.floor(Date.now() / 1000), provider: "Yahoo Finance (Fallback)" })
    } else unavailable.push(symbol)
  }

  if (!quotes.length) return NextResponse.json({ error: "No current quotes returned.", unavailable, fmpError: fmp && !fmp.ok ? fmp.error : undefined }, { status: 502 })
  return NextResponse.json({ quotes, unavailable, provider: fmp?.ok && fmp.data.length ? "Financial Modeling Prep Batch (Primary)" : "Yahoo Finance (Fallback)", fmpStatus: fmp?.ok ? "connected" : getFmpApiKey() ? fmp?.error ?? "unavailable" : "API key missing", refreshedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" } })
}
