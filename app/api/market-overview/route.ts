import { NextResponse } from "next/server"
import { fetchMarketOverview } from "@/lib/dios/server-market"
import { getFmpApiKey } from "@/lib/data-providers/fmp"

export const dynamic = "force-dynamic"

export async function GET() {
  const items = await fetchMarketOverview(getFmpApiKey())
  if (!items.length) {
    return NextResponse.json({ error: "Market overview is temporarily unavailable." }, { status: 502 })
  }
  const refreshedAt = new Date().toISOString()
  return NextResponse.json(
    { items, refreshedAt, status: items.length === 4 ? "live" : "partial" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  )
}
