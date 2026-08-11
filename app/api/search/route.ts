import { NextRequest, NextResponse } from "next/server"
import { searchFmpSymbols } from "@/lib/data-providers/fmp"
import { searchYahoo } from "@/lib/dios/server-market"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (query.length < 1) return NextResponse.json({ results: [] })

  const fmp = await searchFmpSymbols(query)
  if (fmp.ok && fmp.data.length) {
    return NextResponse.json(
      { results: fmp.data, provider: "Financial Modeling Prep (Starter)" },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  try {
    const results = await searchYahoo(query)
    return NextResponse.json(
      { results, provider: "Yahoo Finance (Fallback)" },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Instrument search failed", results: [] },
      { status: 502 },
    )
  }
}
