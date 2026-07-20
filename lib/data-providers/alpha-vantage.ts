import { err, fetchJson, num } from "./http"
import type { ProviderNewsItem, ProviderResult, VerifiedQuote } from "./types"
const BASE = "https://www.alphavantage.co/query"
const key = () => process.env.ALPHA_VANTAGE_API_KEY

export async function getAlphaVantageQuote(symbol: string): Promise<ProviderResult<VerifiedQuote>> {
  const retrievedAt = new Date().toISOString()
  if (!key()) return { ok: false, provider: "Alpha Vantage", error: "ALPHA_VANTAGE_API_KEY is not configured", retrievedAt }
  const sourceUrl = `${BASE}?${new URLSearchParams({ function: "GLOBAL_QUOTE", symbol: symbol.toUpperCase(), apikey: key()! })}`
  try {
    const payload = await fetchJson<Record<string, any>>(sourceUrl)
    const apiError = payload["Error Message"] || payload.Note || payload.Information
    if (apiError) throw new Error(String(apiError))
    const q = payload["Global Quote"]
    const price = num(q?.["05. price"])
    if (price === undefined) throw new Error(`No quote returned for ${symbol}`)
    return { ok: true, provider: "Alpha Vantage", retrievedAt, sourceUrl, data: { symbol: String(q?.["01. symbol"] ?? symbol).toUpperCase(), price, previousClose: num(q?.["08. previous close"]), change: num(q?.["09. change"]), changePercent: num(String(q?.["10. change percent"] ?? "").replace("%", "")), latestTradingDay: String(q?.["07. latest trading day"] ?? "") } }
  } catch (error) { return { ok: false, provider: "Alpha Vantage", error: err(error), retrievedAt, sourceUrl } }
}

function stamp(value?: string) {
  if (!value || value.length < 8) return new Date().toISOString()
  return `${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(9,11)||"00"}:${value.slice(11,13)||"00"}:${value.slice(13,15)||"00"}Z`
}
function sentiment(label?: string): "positive" | "neutral" | "negative" {
  const x = label?.toLowerCase() ?? ""
  if (x.includes("bullish") || x.includes("positive")) return "positive"
  if (x.includes("bearish") || x.includes("negative")) return "negative"
  return "neutral"
}

export async function getAlphaVantageNews(symbol: string, limit = 10): Promise<ProviderResult<ProviderNewsItem[]>> {
  const retrievedAt = new Date().toISOString()
  if (!key()) return { ok: false, provider: "Alpha Vantage", error: "ALPHA_VANTAGE_API_KEY is not configured", retrievedAt }
  const sourceUrl = `${BASE}?${new URLSearchParams({ function: "NEWS_SENTIMENT", tickers: symbol.toUpperCase(), limit: String(limit), sort: "LATEST", apikey: key()! })}`
  try {
    const payload = await fetchJson<any>(sourceUrl, {}, 10000)
    if (payload.Note || payload.Information) throw new Error(payload.Note ?? payload.Information)
    const data = (payload.feed ?? []).slice(0, limit).map((item: any) => {
      const ts = item.ticker_sentiment?.find((x: any) => x.ticker?.toUpperCase() === symbol.toUpperCase())
      return { title: item.title ?? "Untitled article", url: item.url ?? "", source: item.source ?? "Alpha Vantage", publishedAt: stamp(item.time_published), summary: item.summary, sentiment: sentiment(ts?.ticker_sentiment_label ?? item.overall_sentiment_label), sentimentScore: num(ts?.ticker_sentiment_score ?? item.overall_sentiment_score) }
    })
    return { ok: true, provider: "Alpha Vantage", retrievedAt, sourceUrl, data }
  } catch (error) { return { ok: false, provider: "Alpha Vantage", error: err(error), retrievedAt, sourceUrl } }
}
