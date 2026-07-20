import { getAlphaVantageNews, getAlphaVantageQuote } from "./alpha-vantage"
import { getFinnhubCompanyNews, getFinnhubEarnings } from "./finnhub"
import { getSecCompanyFacts, getSecFilings } from "./sec"
import type { ProviderNewsItem, ProviderResult, VerifiedQuote } from "./types"

function dedupeNews(items: ProviderNewsItem[]) {
  const seen = new Set<string>()
  return items.filter(x => x.title && x.url).filter(x => { const k = `${x.url}|${x.title.toLowerCase().trim()}`; if (seen.has(k)) return false; seen.add(k); return true }).sort((a,b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function quoteConfidence(primaryPrice: number, checks: Array<ProviderResult<VerifiedQuote>>) {
  const valid = checks.filter((x): x is Extract<ProviderResult<VerifiedQuote>, { ok: true }> => x.ok && x.data.price > 0)
  const verifiedBy: string[] = [], conflicts: string[] = []
  for (const result of valid) {
    const differencePct = Math.abs(result.data.price - primaryPrice) / Math.max(primaryPrice, 0.000001) * 100
    if (differencePct <= 0.5) verifiedBy.push(result.provider)
    else conflicts.push(`${result.provider} differs by ${differencePct.toFixed(2)}%`)
  }
  return { confidence: Math.max(25, Math.min(99, 60 + verifiedBy.length * 18 - conflicts.length * 20)), verifiedBy, conflicts }
}

export async function getCompanyIntelligence(ticker: string) {
  const symbol = ticker.trim().toUpperCase()
  const [alphaQuote, alphaNews, finnhubNews, finnhubEarnings, secFilings, secFacts] = await Promise.all([
    getAlphaVantageQuote(symbol), getAlphaVantageNews(symbol), getFinnhubCompanyNews(symbol), getFinnhubEarnings(symbol), getSecFilings(symbol), getSecCompanyFacts(symbol),
  ])
  const news = dedupeNews([...(alphaNews.ok ? alphaNews.data : []), ...(finnhubNews.ok ? finnhubNews.data : [])]).slice(0,20)
  const all = [alphaQuote, alphaNews, finnhubNews, finnhubEarnings, secFilings, secFacts]
  return {
    ticker: symbol,
    retrievedAt: new Date().toISOString(),
    quoteChecks: [alphaQuote],
    news,
    earnings: finnhubEarnings.ok ? finnhubEarnings.data : [],
    filings: secFilings.ok ? secFilings.data : [],
    companyFacts: secFacts.ok ? secFacts.data : null,
    warnings: all.filter(x => !x.ok).map(x => `${x.provider}: ${x.error}`),
    providers: { alphaQuote, alphaNews, finnhubNews, finnhubEarnings, secFilings, secFacts },
  }
}
