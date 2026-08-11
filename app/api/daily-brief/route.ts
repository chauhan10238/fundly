import { NextRequest, NextResponse } from "next/server"
import {
  buildDailyBrief,
  buildHolding,
} from "@/lib/dios/daily-brief-engine"
import type {
  BriefMarketItem,
  BriefOpportunity,
  DailyBriefRequest,
} from "@/lib/dios/daily-brief-types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const DEFAULT_ETF_SCAN = [
  "VOO", "QQQ", "IWM", "DIA", "VTI", "VT", "SCHD", "VUG", "VTV", "QUAL",
  "SMH", "SOXX", "VGT", "XLK", "XLE", "XLF", "XLV", "XLI", "XLP", "XLU",
  "GLD", "SLV", "GDX", "COPX", "URA", "IBIT", "TLT", "IEF", "HYG", "LQD",
  "EFA", "EEM", "INDA", "EWJ", "VGK", "VNQ", "PAVE", "ITA", "CIBR", "BOTZ",
]

function normaliseSymbol(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, { ...init, cache: "no-store" })
    if (!response.ok) return null
    return await response.json() as T
  } catch {
    return null
  }
}

function sourceFamilies(payload: any): string[] {
  const values = (payload?.context?.sources ?? []).map((source: any) => String(source?.name ?? ""))
  return values.map((name: string) => {
    const n = name.toLowerCase()
    if (n.includes("yahoo")) return "Yahoo Finance"
    if (n.includes("finnhub")) return "Finnhub"
    if (n.includes("alpha vantage")) return "Alpha Vantage"
    if (n.includes("sec") || n.includes("edgar")) return "SEC EDGAR"
    if (n.includes("fred")) return "FRED"
    if (n.includes("fmp")) return "FMP"
    return name.split("—")[0]?.trim() || "Other"
  }).filter(Boolean)
}

export async function POST(request: NextRequest) {
  let body: DailyBriefRequest
  try {
    body = await request.json() as DailyBriefRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const holdings = Array.isArray(body.holdings)
    ? body.holdings
        .map((item) => ({ ...item, ticker: normaliseSymbol(item.ticker) }))
        .filter((item) => item.ticker)
        .slice(0, 30)
    : []

  const origin = request.nextUrl.origin
  const warnings: string[] = []
  const families = new Set<string>()

  const marketPayload = await fetchJson<any>(`${origin}/api/market-overview`)
  const marketItems: BriefMarketItem[] = Array.isArray(marketPayload?.items)
    ? marketPayload.items.map((item: any) => ({
        symbol: String(item.symbol),
        label: String(item.label ?? item.symbol),
        price: Number(item.price ?? 0),
        previousClose: Number(item.previousClose ?? 0),
        change: Number(item.price ?? 0) - Number(item.previousClose ?? 0),
        changePercent: Number(item.changePercent ?? 0),
        provider: String(item.provider ?? "Unknown"),
      }))
    : []
  marketItems.forEach((item) => families.add(item.provider))
  if (!marketItems.length) warnings.push("Market overview was unavailable.")

  const holdingPayloads = await Promise.all(
    holdings.map(async (holding) => {
      const payload = await fetchJson<any>(
        `${origin}/api/analysis?ticker=${encodeURIComponent(holding.ticker)}`,
      )
      if (payload) sourceFamilies(payload).forEach((family) => families.add(family))
      return { holding, payload }
    }),
  )

  const analysedHoldings = holdingPayloads
    .map(({ holding, payload }) => payload ? buildHolding(holding, payload) : null)
    .filter((item): item is NonNullable<typeof item> => item !== null)

  if (analysedHoldings.length < holdings.length) {
    warnings.push(`${holdings.length - analysedHoldings.length} holding(s) could not be analysed live.`)
  }

  // Phase 1 uses a capped ETF scan to stay within Vercel execution limits.
  // Phase 2/FMP can increase this safely to 100–150 symbols.
  const requestedScan = (body.scanSymbols?.length ? body.scanSymbols : DEFAULT_ETF_SCAN)
    .map(normaliseSymbol)
    .filter(Boolean)
    .filter((symbol, index, all) => all.indexOf(symbol) === index)
    .slice(0, 24)

  const scanPayloads = await Promise.all(
    requestedScan.map(async (ticker) => {
      const payload = await fetchJson<any>(
        `${origin}/api/analysis?ticker=${encodeURIComponent(ticker)}`,
      )
      if (payload) sourceFamilies(payload).forEach((family) => families.add(family))
      return { ticker, payload }
    }),
  )

  const opportunities: BriefOpportunity[] = scanPayloads
    .map(({ ticker, payload }) => {
      const holding = payload
        ? buildHolding({ ticker, weight: 0 }, payload)
        : null
      if (!holding || holding.shortOutlook !== "Bullish") return null
      return {
        ticker,
        score: holding.score,
        confidence: holding.confidence,
        dataQuality: holding.dataQuality,
        outlook: holding.shortOutlook,
        horizon: "1–3 trading days",
        reasons: holding.reasons,
      } satisfies BriefOpportunity
    })
    .filter((item): item is BriefOpportunity => item !== null)
    .sort((a, b) =>
      (b.score * 0.65 + b.confidence * 0.2 + b.dataQuality * 0.15) -
      (a.score * 0.65 + a.confidence * 0.2 + a.dataQuality * 0.15),
    )
    .slice(0, 8)

  const brief = buildDailyBrief({
    marketItems,
    holdings: analysedHoldings,
    opportunities,
    inputHoldings: holdings,
    sourceFamilies: Array.from(families),
    warnings,
  })

  return NextResponse.json(brief, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  })
}
