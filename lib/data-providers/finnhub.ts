import { err, fetchJson, num } from "./http"
import type { EarningsEvent, ProviderNewsItem, ProviderResult } from "./types"
const BASE = "https://finnhub.io/api/v1"
const key = () => process.env.FINNHUB_API_KEY
const dateOffset = (days: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10) }

export async function getFinnhubCompanyNews(symbol: string, from = dateOffset(-7), to = dateOffset(0)): Promise<ProviderResult<ProviderNewsItem[]>> {
  const retrievedAt = new Date().toISOString()
  if (!key()) return { ok: false, provider: "Finnhub", error: "FINNHUB_API_KEY is not configured", retrievedAt }
  const sourceUrl = `${BASE}/company-news?${new URLSearchParams({ symbol: symbol.toUpperCase(), from, to, token: key()! })}`
  try {
    const payload = await fetchJson<any[]>(sourceUrl, {}, 10000)
    if (!Array.isArray(payload)) throw new Error("Invalid Finnhub news response")
    const data = payload.slice(0,15).map(item => ({ title: item.headline ?? "Untitled article", url: item.url ?? "", source: item.source ?? "Finnhub", publishedAt: item.datetime ? new Date(item.datetime * 1000).toISOString() : retrievedAt, summary: item.summary, sentiment: "neutral" as const }))
    return { ok: true, provider: "Finnhub", retrievedAt, sourceUrl, data }
  } catch (error) { return { ok: false, provider: "Finnhub", error: err(error), retrievedAt, sourceUrl } }
}

export async function getFinnhubEarnings(symbol: string, from = dateOffset(-30), to = dateOffset(90)): Promise<ProviderResult<EarningsEvent[]>> {
  const retrievedAt = new Date().toISOString()
  if (!key()) return { ok: false, provider: "Finnhub", error: "FINNHUB_API_KEY is not configured", retrievedAt }
  const sourceUrl = `${BASE}/calendar/earnings?${new URLSearchParams({ symbol: symbol.toUpperCase(), from, to, token: key()! })}`
  try {
    const payload = await fetchJson<any>(sourceUrl, {}, 10000)
    const data = (payload.earningsCalendar ?? []).map((item: any) => ({ symbol: item.symbol ?? symbol.toUpperCase(), date: item.date ?? "", hour: item.hour, epsEstimate: num(item.epsEstimate), epsActual: num(item.epsActual), revenueEstimate: num(item.revenueEstimate), revenueActual: num(item.revenueActual), quarter: num(item.quarter), year: num(item.year) }))
    return { ok: true, provider: "Finnhub", retrievedAt, sourceUrl, data }
  } catch (error) { return { ok: false, provider: "Finnhub", error: err(error), retrievedAt, sourceUrl } }
}
