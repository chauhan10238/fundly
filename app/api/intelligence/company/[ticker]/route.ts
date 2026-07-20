import { NextRequest, NextResponse } from "next/server"
import { getCompanyIntelligence } from "@/lib/data-providers"
export const dynamic = "force-dynamic"
const normalize = (x: string) => x.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "")
export async function GET(_request: NextRequest, context: { params: Promise<{ ticker: string }> }) {
  const ticker = normalize((await context.params).ticker)
  if (!ticker) return NextResponse.json({ error: "Provide ticker." }, { status: 400 })
  return NextResponse.json(await getCompanyIntelligence(ticker), { headers: { "Cache-Control": "private, no-store, max-age=0" } })
}
