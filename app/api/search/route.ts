import { NextRequest, NextResponse } from "next/server"
import { searchYahoo } from "@/lib/dios/server-market"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (query.length < 1) return NextResponse.json({ results: [] })
  try {
    const results = await searchYahoo(query)
    return NextResponse.json({ results, provider: "Yahoo Finance" }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Instrument search failed", results: [] },
      { status: 502 },
    )
  }
}
