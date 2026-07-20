import { NextResponse } from "next/server"
import { getProviderHealth } from "@/lib/data-providers"
export const dynamic = "force-dynamic"
export async function GET() {
  const providers = await getProviderHealth(), connected = providers.filter(x => x.ok).length
  return NextResponse.json({ status: connected === providers.length ? "live" : connected ? "partial" : "error", connected, total: providers.length, providers, checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store, max-age=0" } })
}
