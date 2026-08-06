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
    .map((item) => ({
      symbol: item.ticker,
      name: item.name,
      exchange: "",
      type: item.type,
      currency: item.currency,
    }))
}

function dedupe(items: SearchResult[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.symbol}-${item.exchange}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (!query) return NextResponse.json({ results: [] })

  const [fmp, yahoo] = await Promise.allSettled([
    searchFmpSymbols(query),
    searchYahoo(query),
  ])

  const fmpRows = fmp.status === "fulfilled" && fmp.value.ok ? fmp.value.data : []
  const yahooRows = yahoo.status === "fulfilled" ? yahoo.value : []
  const localRows = localResults(query)
  const results = dedupe([...fmpRows, ...yahooRows, ...localRows]).slice(0, 12)

  const provider = fmpRows.length
    ? "Financial Modeling Prep (Primary)"
    : yahooRows.length
      ? "Yahoo Finance (Fallback)"
      : localRows.length
        ? "Fundly verified instrument list (Offline fallback)"
        : "No provider returned a match"

  return NextResponse.json(
    {
      results,
      provider,
      diagnostics: {
        fmp: fmp.status === "fulfilled" ? (fmp.value.ok ? "ok" : fmp.value.error || "unavailable") : "unavailable",
        yahoo: yahoo.status === "fulfilled" ? "ok" : "unavailable",
      },
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  )
}
