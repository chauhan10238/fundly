import { NextRequest, NextResponse } from "next/server"
import { getInstrument } from "@/lib/dios/universe"
import type { ExternalAnalysisContext, LiveNewsItem, SourceCitation } from "@/lib/dios/types"

export const dynamic = "force-dynamic"

type RawQuote = {
  symbol?: string
  price?: number
  change?: number
  changesPercentage?: number
  changePercentage?: number
  previousClose?: number
}

type RawNews = {
  title?: string
  publishedDate?: string
  url?: string
  site?: string
  text?: string
  symbol?: string
}

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "")
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": "DIOS/1.3.1" },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function fetchQuote(ticker: string, apiKey: string) {
  const endpoints = [
    `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(apiKey)}`,
    `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(ticker)}?apikey=${encodeURIComponent(apiKey)}`,
  ]
  for (const url of endpoints) {
    try {
      const payload = await fetchJson(url)
      const rows: RawQuote[] = Array.isArray(payload) ? payload : payload ? [payload] : []
      const quote = rows[0]
      if (!quote || typeof quote.price !== "number" || quote.price <= 0) continue
      const previousClose = typeof quote.previousClose === "number"
        ? quote.previousClose
        : typeof quote.change === "number" ? quote.price - quote.change : quote.price
      const rawPct = quote.changesPercentage ?? quote.changePercentage
      const changePercent = typeof rawPct === "number"
        ? rawPct
        : previousClose ? ((quote.price - previousClose) / previousClose) * 100 : 0
      return { price: quote.price, previousClose, changePercent }
    } catch {
      // Try legacy endpoint.
    }
  }
  return null
}

function classifySentiment(title: string, text = ""): LiveNewsItem["sentiment"] {
  const value = `${title} ${text}`.toLowerCase()
  const positive = ["beat", "raises", "raised", "upgrade", "surge", "growth", "record", "strong", "approval", "expands"]
  const negative = ["miss", "cuts", "cut", "downgrade", "fall", "probe", "lawsuit", "ban", "restriction", "warning", "weak"]
  const pos = positive.filter((word) => value.includes(word)).length
  const neg = negative.filter((word) => value.includes(word)).length
  return pos > neg ? "positive" : neg > pos ? "negative" : "neutral"
}

async function fetchStockNews(ticker: string, apiKey: string): Promise<LiveNewsItem[]> {
  const urls = [
    `https://financialmodelingprep.com/stable/news/stock?symbols=${encodeURIComponent(ticker)}&limit=8&apikey=${encodeURIComponent(apiKey)}`,
    `https://financialmodelingprep.com/api/v3/stock_news?tickers=${encodeURIComponent(ticker)}&limit=8&apikey=${encodeURIComponent(apiKey)}`,
  ]
  for (const url of urls) {
    try {
      const payload = await fetchJson(url)
      if (!Array.isArray(payload)) continue
      return (payload as RawNews[]).slice(0, 8).map((item) => ({
        title: item.title || "Market update",
        publishedAt: item.publishedDate || new Date().toISOString(),
        url: item.url || "",
        source: item.site || "Financial Modeling Prep news feed",
        sentiment: classifySentiment(item.title || "", item.text || ""),
        relevance: "company" as const,
      }))
    } catch {
      // Try next endpoint.
    }
  }
  return []
}

async function fetchGeopoliticalNews(ticker: string, themes: string[]): Promise<LiveNewsItem[]> {
  const queryBits = [ticker, ...themes, "geopolitics OR war OR sanctions OR tariffs OR export controls"].filter(Boolean)
  const query = encodeURIComponent(queryBits.join(" "))
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&format=json&maxrecords=6&sort=hybridrel&timespan=2d`
  try {
    const payload = await fetchJson(url)
    const articles = Array.isArray(payload?.articles) ? payload.articles : []
    return articles.slice(0, 6).map((item: any) => ({
      title: item.title || "Global risk update",
      publishedAt: item.seendate || new Date().toISOString(),
      url: item.url || "",
      source: item.domain || "GDELT global news index",
      sentiment: classifySentiment(item.title || ""),
      relevance: "geopolitics" as const,
    }))
  } catch {
    return []
  }
}

async function fetchProfile(ticker: string, apiKey: string) {
  try {
    const payload = await fetchJson(`https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(apiKey)}`)
    const row = Array.isArray(payload) ? payload[0] : payload
    if (!row) return null
    return {
      marketCap: typeof row.marketCap === "number" ? row.marketCap : undefined,
      beta: typeof row.beta === "number" ? row.beta : undefined,
      sector: row.sector || undefined,
      industry: row.industry || undefined,
      companyName: row.companyName || undefined,
      description: row.description || undefined,
    }
  } catch {
    return null
  }
}

async function fetchEarnings(ticker: string, apiKey: string) {
  const today = new Date()
  const from = new Date(today); from.setDate(from.getDate() - 120)
  const to = new Date(today); to.setDate(to.getDate() + 120)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  try {
    const payload = await fetchJson(`https://financialmodelingprep.com/stable/earnings-calendar?from=${fmt(from)}&to=${fmt(to)}&apikey=${encodeURIComponent(apiKey)}`)
    if (!Array.isArray(payload)) return null
    const rows = payload.filter((row: any) => String(row.symbol || "").toUpperCase() === ticker)
    if (!rows.length) return null
    rows.sort((a: any, b: any) => Math.abs(new Date(a.date).getTime() - today.getTime()) - Math.abs(new Date(b.date).getTime() - today.getTime()))
    const row = rows[0]
    return {
      date: row.date,
      epsEstimated: typeof row.epsEstimated === "number" ? row.epsEstimated : undefined,
      epsActual: typeof row.epsActual === "number" ? row.epsActual : undefined,
      revenueEstimated: typeof row.revenueEstimated === "number" ? row.revenueEstimated : undefined,
      revenueActual: typeof row.revenueActual === "number" ? row.revenueActual : undefined,
      isUpcoming: new Date(row.date) >= new Date(today.toISOString().slice(0, 10)),
    }
  } catch {
    return null
  }
}

async function fetchEtfHoldings(ticker: string, apiKey: string) {
  try {
    const payload = await fetchJson(`https://financialmodelingprep.com/stable/etf/holdings?symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(apiKey)}`)
    if (!Array.isArray(payload)) return []
    return payload.slice(0, 20).map((row: any) => ({
      symbol: String(row.asset || row.symbol || "").toUpperCase(),
      name: row.name || row.assetName || row.asset || "Holding",
      weight: Number(row.weightPercentage ?? row.weight ?? 0),
    })).filter((row: any) => row.symbol)
  } catch {
    return []
  }
}

function source(id: string, name: string, date: string, url: string, retrieved: string): SourceCitation {
  return { id, name, date, url, retrieved }
}

export async function GET(request: NextRequest) {
  const ticker = normalizeTicker(request.nextUrl.searchParams.get("ticker") ?? "")
  if (!ticker) return NextResponse.json({ error: "Provide a ticker." }, { status: 400 })

  const instrument = getInstrument(ticker)
  if (!instrument) return NextResponse.json({ error: `${ticker} is not yet in the DIOS tracked universe.` }, { status: 404 })

  const refreshedAt = new Date().toISOString()
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return NextResponse.json({ error: "FMP_API_KEY is not configured in Vercel." }, { status: 503 })

  const [quote, stockNews, geopoliticalNews, profile, earnings, etfHoldings] = await Promise.all([
    fetchQuote(ticker, apiKey),
    fetchStockNews(ticker, apiKey),
    fetchGeopoliticalNews(ticker, instrument.themes || []),
    instrument.type === "stock" ? fetchProfile(ticker, apiKey) : Promise.resolve(null),
    instrument.type === "stock" ? fetchEarnings(ticker, apiKey) : Promise.resolve(null),
    instrument.type === "etf" ? fetchEtfHoldings(ticker, apiKey) : Promise.resolve([]),
  ])

  const warnings: string[] = []
  if (!quote) warnings.push("Live quote unavailable; DIOS will use the tracked fallback price.")
  if (!stockNews.length) warnings.push("Ticker-specific news was unavailable on the current FMP plan or endpoint.")
  if (!geopoliticalNews.length) warnings.push("No recent geopolitical article matched the instrument in GDELT.")

  const news = [...stockNews, ...geopoliticalNews]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 10)

  const sources: SourceCitation[] = []
  let sourceId = 1
  if (quote) sources.push(source(`S${sourceId++}`, "Financial Modeling Prep — live quote", refreshedAt.slice(0, 10), "https://site.financialmodelingprep.com/developer/docs/stable/quote", refreshedAt))
  for (const item of news.slice(0, 6)) {
    sources.push(source(`S${sourceId++}`, `${item.source} — ${item.title}`, item.publishedAt.slice(0, 10), item.url, refreshedAt))
  }
  if (earnings) sources.push(source(`S${sourceId++}`, "Financial Modeling Prep — earnings calendar", earnings.date, "https://site.financialmodelingprep.com/developer/docs/stable/earnings-calendar", refreshedAt))
  if (profile) sources.push(source(`S${sourceId++}`, "Financial Modeling Prep — company profile", refreshedAt.slice(0, 10), "https://site.financialmodelingprep.com/developer/docs/stable/profile-symbol", refreshedAt))
  if (etfHoldings.length) sources.push(source(`S${sourceId++}`, "Financial Modeling Prep — ETF holdings", refreshedAt.slice(0, 10), "https://site.financialmodelingprep.com/developer/docs/stable", refreshedAt))

  const context: ExternalAnalysisContext = {
    refreshedAt,
    news,
    earnings,
    fundamentals: profile,
    etfHoldings,
    sources,
    warnings,
  }

  const snapshot = quote ? { ...quote, refreshedAt, provider: "Financial Modeling Prep", isLive: true } : {
    price: instrument.price,
    previousClose: instrument.prevClose,
    changePercent: instrument.prevClose ? ((instrument.price - instrument.prevClose) / instrument.prevClose) * 100 : 0,
    refreshedAt,
    provider: "DIOS tracked fallback",
    isLive: false,
  }

  return NextResponse.json({ ticker, snapshot, context }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  })
}
