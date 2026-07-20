import { NextRequest, NextResponse } from "next/server"
import {
  getCompanyIntelligence,
  normalizeCompanyIntelligence,
} from "@/lib/data-providers"

export const dynamic = "force-dynamic"

function normalize(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "")
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await context.params
  const ticker = normalize(rawTicker)

  if (!ticker) {
    return NextResponse.json({ error: "Provide ticker." }, { status: 400 })
  }

  const raw = await getCompanyIntelligence(ticker)
  const intelligence = normalizeCompanyIntelligence(raw)

  return NextResponse.json(intelligence, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  })
}
