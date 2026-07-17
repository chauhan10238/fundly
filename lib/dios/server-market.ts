import type { Instrument, InstrumentType, LiveNewsItem, MarketSnapshot, SourceCitation } from "./types"

type YahooChartResult = {
  meta?: {
    symbol?: string
    shortName?: string
    longName?: string
    instrumentType?: string
    currency?: string
    exchangeName?: string
    regularMarketPrice?: number
    chartPreviousClose?: number
    previousClose?: number
    regularMarketTime?: number
  }
}

export type SearchResult = {
  symbol: string
  name: string
  exchange: string
  type: InstrumentType
  currency?: string
}

function cleanSymbol(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 DIOS/2.0",
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function mapYahooType(value?: string): InstrumentType {
  const v = (value ?? "").toUpperCase()
  return v === "ETF" || v === "MUTUALFUND" ? "etf" : "stock"
}

export async function searchYahoo(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (!q) return []
  const payload = await fetchJson(
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&enableFuzzyQuery=true`,
  )
  const rows = Array.isArray(payload?.quotes) ? payload.quotes : []
  return rows
    .filter((row: any) => row?.symbol && ["EQUITY", "ETF", "MUTUALFUND"].includes(String(row.quoteType ?? "").toUpperCase()))
    .map((row: any) => ({
      symbol: cleanSymbol(row.symbol),
      name: row.longname || row.shortname || row.symbol,
      exchange: row.exchDisp || row.exchange || "",
      type: mapYahooType(row.quoteType),
      currency: row.currency || undefined,
    }))
    .filter((row: SearchResult) => Boolean(row.symbol))
}

export async function fetchYahooQuote(symbolInput: string): Promise<{ snapshot: MarketSnapshot; name: string; currency: string; type: InstrumentType } | null> {
  const symbol = cleanSymbol(symbolInput)
  if (!symbol) return null
  const payload = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`,
  )
  const result: YahooChartResult | undefined = payload?.chart?.result?.[0]
  const meta = result?.meta
  const price = meta?.regularMarketPrice
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null
  const previousClose =
    typeof meta?.chartPreviousClose === "number" && meta.chartPreviousClose > 0
      ? meta.chartPreviousClose
      : typeof meta?.previousClose === "number" && meta.previousClose > 0
        ? meta.previousClose
        : price
  return {
    snapshot: {
      price,
      previousClose,
      changePercent: previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
      refreshedAt: new Date().toISOString(),
      provider: "Yahoo Finance",
      isLive: true,
    },
    name: meta?.longName || meta?.shortName || symbol,
    currency: meta?.currency || "USD",
    type: mapYahooType(meta?.instrumentType),
  }
}

export async function fetchFmpQuote(symbolInput: string, apiKey?: string): Promise<MarketSnapshot | null> {
  if (!apiKey) return null
  const symbol = cleanSymbol(symbolInput)
  const urls = [
    `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
    `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${encodeURIComponent(apiKey)}`,
  ]
  for (const url of urls) {
    try {
      const payload = await fetchJson(url)
      const row = Array.isArray(payload) ? payload[0] : payload
      const price = row?.price
      if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) continue
      const previousClose = typeof row.previousClose === "number" && row.previousClose > 0
        ? row.previousClose
        : typeof row.change === "number" ? price - row.change : price
      const pct = row.changesPercentage ?? row.changePercentage
      return {
        price,
        previousClose,
        changePercent: typeof pct === "number" ? pct : previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
        refreshedAt: new Date().toISOString(),
        provider: "Financial Modeling Prep",
        isLive: true,
      }
    } catch {
      // next endpoint
    }
  }
  return null
}

export async function resolveLiveQuote(symbol: string, apiKey?: string) {
  try {
    const yahoo = await fetchYahooQuote(symbol)
    if (yahoo) return yahoo
  } catch {
    // FMP fallback
  }
  const fmp = await fetchFmpQuote(symbol, apiKey)
  if (!fmp) return null
  return { snapshot: fmp, name: cleanSymbol(symbol), currency: "USD", type: "stock" as InstrumentType }
}

export function buildDynamicInstrument(args: {
  symbol: string
  name: string
  type: InstrumentType
  currency?: string
  price: number
  previousClose: number
  sector?: string
  industry?: string
  country?: string
}): Instrument {
  const isEtf = args.type === "etf"
  const sector = args.sector || (isEtf ? "Diversified" : "Unknown")
  return {
    ticker: cleanSymbol(args.symbol),
    name: args.name || cleanSymbol(args.symbol),
    type: args.type,
    sector,
    industry: args.industry || (isEtf ? "Exchange Traded Fund" : "Unknown"),
    country: args.country || "United States",
    currency: args.currency || "USD",
    tags: isEtf ? ["core"] : ["growth"],
    riskBand: isEtf ? "medium" : "high",
    price: args.price,
    prevClose: args.previousClose,
    qualityHint: 55,
    valuationHint: 50,
    growthHint: 50,
    momentumHint: args.previousClose > 0 && args.price >= args.previousClose ? 58 : 45,
    themes: [],
  }
}

export function sourceFromQuote(provider: string, symbol: string, retrieved: string): SourceCitation {
  return {
    id: "S1",
    name: `${provider} — current quote for ${symbol}`,
    date: retrieved.slice(0, 10),
    url: provider === "Yahoo Finance" ? `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}` : "",
    retrieved,
  }
}

export async function fetchYahooNews(symbol: string): Promise<LiveNewsItem[]> {
  try {
    const payload = await fetchJson(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=8`,
    )
    const rows = Array.isArray(payload?.news) ? payload.news : []
    return rows.slice(0, 8).map((row: any) => ({
      title: row.title || "Market update",
      publishedAt: row.providerPublishTime ? new Date(row.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
      url: row.link || "",
      source: row.publisher || "Yahoo Finance",
      sentiment: "neutral" as const,
      relevance: "company" as const,
    }))
  } catch {
    return []
  }
}
