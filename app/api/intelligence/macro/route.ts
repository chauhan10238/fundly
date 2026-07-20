import { NextResponse } from "next/server"
import { getBrentSpotPrice, getFredMacroSnapshot, getWtiSpotPrice } from "@/lib/data-providers"
export const dynamic = "force-dynamic"
export async function GET() {
  const [fred, wti, brent] = await Promise.all([getFredMacroSnapshot(), getWtiSpotPrice(), getBrentSpotPrice()])
  const all = [...fred, wti, brent]
  return NextResponse.json({ refreshedAt: new Date().toISOString(), macro: fred.filter(x => x.ok).map(x => x.data), energy: [wti,brent].filter(x => x.ok).map(x => x.data), warnings: all.filter(x => !x.ok).map(x => `${x.provider}: ${x.error}`) }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } })
}
