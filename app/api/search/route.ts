import { NextRequest, NextResponse } from "next/server"
import { searchFmpSymbols } from "@/lib/data-providers/fmp"
import { searchYahoo, type SearchResult } from "@/lib/dios/server-market"
import { UNIVERSE_LIST } from "@/lib/dios/universe"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function localResults(query: string): SearchResult[] {
  const q = query.trim().toUpperCase()
  if (!q) return []
  return UNIVERSE_LIST
    .filter((item) => item.ticker.includes(q) || item.name.toUpperCase().includes(q))
    .slice(0, 12)
    .map((item) => ({ symbol: item.ticker, name: item.name, exchange: "", type: item.type, currency: item.currency }))
}

function dedupe(items: SearchResult[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.symbol.toUpperCase()
    if (!item.symbol || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function within<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (!query) return NextResponse.json({ results: [] })

  const [fmpResult, yahooRows] = await Promise.all([
    within(searchFmpSymbols(query), 3500, null),
    within(searchYahoo(query), 3500, [] as SearchResult[]),
  ])

  const fmpRows = fmpResult?.ok ? fmpResult.data : []
  const localRows = localResults(query)
  const results = dedupe([...fmpRows, ...yahooRows, ...localRows]).slice(0, 12)

  return NextResponse.json({
    results,
    provider: fmpRows.length ? "Financial Modeling Prep" : yahooRows.length ? "Yahoo Finance" : localRows.length ? "Fundly instrument list" : "No match",
    diagnostics: {
      fmp: fmpResult?.ok ? "ok" : fmpResult?.error || "timed out/unavailable",
      yahoo: yahooRows.length ? "ok" : "timed out/unavailable",
    },
  }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=300" } })
}
