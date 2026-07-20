import {
  getAlphaVantageNews,
  getAlphaVantageQuote,
} from "./alpha-vantage"
import { getFinnhubCompanyNews, getFinnhubEarnings } from "./finnhub"
import { getSecCompanyFacts, getSecFilings } from "./sec"
import type {
  ProviderNewsItem,
  ProviderResult,
  SecCompanyFacts,
  SecFiling,
  VerifiedQuote,
  EarningsEvent,
} from "./types"

function dedupeNews(items: ProviderNewsItem[]): ProviderNewsItem[] {
  const seen = new Set<string>()
  return items
    .filter((item) => item.title && item.url)
    .filter((item) => {
      const key = `${item.url}|${item.title.toLowerCase().trim()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function quoteConfidence(
  primaryPrice: number,
  checks: Array<ProviderResult<VerifiedQuote>>,
): {
  confidence: number
  verifiedBy: string[]
  conflicts: string[]
} {
  const valid = checks.filter(
    (item): item is Extract<ProviderResult<VerifiedQuote>, { ok: true }> =>
      item.ok && item.data.price > 0,
  )

  if (!valid.length) {
    return { confidence: 55, verifiedBy: [], conflicts: [] }
  }

  const verifiedBy: string[] = []
  const conflicts: string[] = []

  for (const result of valid) {
    const differencePct =
      Math.abs(result.data.price - primaryPrice) /
      Math.max(primaryPrice, 0.000001) *
      100

    if (differencePct <= 0.5) {
      verifiedBy.push(result.provider)
    } else {
      conflicts.push(`${result.provider} differs by ${differencePct.toFixed(2)}%`)
    }
  }

  const confidence = Math.max(
    25,
    Math.min(99, 60 + verifiedBy.length * 18 - conflicts.length * 20),
  )

  return { confidence, verifiedBy, conflicts }
}

export interface ReturnTypeCompanyIntelligence {
  ticker: string
  retrievedAt: string
  quoteChecks: Array<ProviderResult<VerifiedQuote>>
  news: ProviderNewsItem[]
  earnings: EarningsEvent[]
  filings: SecFiling[]
  companyFacts: SecCompanyFacts | null
  warnings: string[]
  providers: {
    alphaQuote: ProviderResult<VerifiedQuote>
    alphaNews: ProviderResult<ProviderNewsItem[]>
    finnhubNews: ProviderResult<ProviderNewsItem[]>
    finnhubEarnings: ProviderResult<EarningsEvent[]>
    secFilings: ProviderResult<SecFiling[]>
    secFacts: ProviderResult<SecCompanyFacts>
  }
}

export async function getCompanyIntelligence(
  ticker: string,
): Promise<ReturnTypeCompanyIntelligence> {
  const symbol = ticker.trim().toUpperCase()

  const [
    alphaQuote,
    alphaNews,
    finnhubNews,
    finnhubEarnings,
    secFilings,
    secFacts,
  ] = await Promise.all([
    getAlphaVantageQuote(symbol),
    getAlphaVantageNews(symbol),
    getFinnhubCompanyNews(symbol),
    getFinnhubEarnings(symbol),
    getSecFilings(symbol),
    getSecCompanyFacts(symbol),
  ])

  const news = dedupeNews([
    ...(alphaNews.ok ? alphaNews.data : []),
    ...(finnhubNews.ok ? finnhubNews.data : []),
  ]).slice(0, 25)

  const warnings = [
    alphaQuote,
    alphaNews,
    finnhubNews,
    finnhubEarnings,
    secFilings,
    secFacts,
  ]
    .filter((item) => !item.ok)
    .map((item) => `${item.provider}: ${item.error}`)

  return {
    ticker: symbol,
    retrievedAt: new Date().toISOString(),
    quoteChecks: [alphaQuote],
    news,
    earnings: finnhubEarnings.ok ? finnhubEarnings.data : [],
    filings: secFilings.ok ? secFilings.data : [],
    companyFacts: secFacts.ok ? secFacts.data : null,
    warnings,
    providers: {
      alphaQuote,
      alphaNews,
      finnhubNews,
      finnhubEarnings,
      secFilings,
      secFacts,
    },
  }
}
