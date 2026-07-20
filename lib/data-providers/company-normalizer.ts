import type { EarningsEvent, ProviderResult, SecFiling, VerifiedQuote } from "./types"
import type {
  InstitutionalCompanyIntelligence,
  NormalizedEarnings,
  ProviderConfidence,
} from "./normalized-types"
import { calculateFinancialHealth, normalizeSecCompanyFacts } from "./sec-normalizer"
import { normalizeNews } from "./news-normalizer"
import type { ReturnTypeCompanyIntelligence } from "./intelligence"

function daysUntil(date?: string) {
  if (!date) return undefined
  const target = Date.parse(`${date}T00:00:00Z`)
  if (!Number.isFinite(target)) return undefined
  return Math.ceil((target - Date.now()) / 86_400_000)
}

function surprise(actual?: number, estimate?: number) {
  if (
    actual === undefined ||
    estimate === undefined ||
    estimate === 0
  ) return undefined
  return ((actual - estimate) / Math.abs(estimate)) * 100
}

function normalizeEarnings(events: EarningsEvent[]): NormalizedEarnings {
  const today = new Date().toISOString().slice(0, 10)
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))
  const next = sorted.find((event) => event.date >= today)
  const latest = [...sorted]
    .filter((event) => event.date < today && event.epsActual !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))[0]

  return {
    nextDate: next?.date,
    daysUntil: daysUntil(next?.date),
    timing: next?.hour,
    epsEstimate: next?.epsEstimate,
    revenueEstimate: next?.revenueEstimate,
    latestActualDate: latest?.date,
    latestEpsActual: latest?.epsActual,
    latestEpsEstimate: latest?.epsEstimate,
    latestEpsSurprisePercent: surprise(latest?.epsActual, latest?.epsEstimate),
    latestRevenueActual: latest?.revenueActual,
    latestRevenueEstimate: latest?.revenueEstimate,
    latestRevenueSurprisePercent: surprise(
      latest?.revenueActual,
      latest?.revenueEstimate,
    ),
  }
}

function providerConfidence(
  raw: ReturnTypeCompanyIntelligence,
): ProviderConfidence {
  const checks: Array<[string, boolean, string | undefined]> = [
    [
      "Alpha Vantage",
      raw.providers.alphaQuote.ok || raw.providers.alphaNews.ok,
      !raw.providers.alphaQuote.ok ? raw.providers.alphaQuote.error : undefined,
    ],
    [
      "Finnhub",
      raw.providers.finnhubNews.ok || raw.providers.finnhubEarnings.ok,
      !raw.providers.finnhubNews.ok ? raw.providers.finnhubNews.error : undefined,
    ],
    [
      "SEC EDGAR",
      raw.providers.secFilings.ok || raw.providers.secFacts.ok,
      !raw.providers.secFacts.ok ? raw.providers.secFacts.error : undefined,
    ],
  ]

  const connected = checks.filter(([, ok]) => ok).map(([name]) => name)
  const unavailable = checks.filter(([, ok]) => !ok).map(([name]) => name)
  const warnings = checks
    .filter(([, ok]) => !ok)
    .map(([name, , error]) => `${name}: ${error ?? "Unavailable"}`)

  const score = Math.max(25, Math.min(98, 40 + connected.length * 18 - unavailable.length * 8))

  return {
    score,
    level: score >= 80 ? "high" : score >= 60 ? "medium" : "low",
    connected,
    unavailable,
    warnings,
  }
}

function summaryLines(
  entityName: string,
  fundamentals: ReturnType<typeof normalizeSecCompanyFacts> | null,
  health: ReturnType<typeof calculateFinancialHealth> | null,
  earnings: NormalizedEarnings,
  news: ReturnType<typeof normalizeNews>,
) {
  const lines: string[] = []

  if (health) {
    lines.push(`${entityName} has a ${health.label.toLowerCase()} financial health score of ${health.score}/100.`)
  }

  if (fundamentals?.revenueGrowth?.changePercent !== undefined) {
    const growth = fundamentals.revenueGrowth.changePercent
    lines.push(`Latest annual revenue growth was ${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%.`)
  }

  if (fundamentals?.freeCashFlowTTM !== undefined) {
    lines.push(
      fundamentals.freeCashFlowTTM >= 0
        ? "The business generated positive trailing free cash flow."
        : "Trailing free cash flow was negative and needs monitoring.",
    )
  }

  if (earnings.nextDate) {
    lines.push(`The next reported earnings date is ${earnings.nextDate}${earnings.daysUntil !== undefined ? `, in ${earnings.daysUntil} days` : ""}.`)
  }

  if (news.articleCount) {
    lines.push(`Recent news sentiment is ${news.sentiment} with ${news.articleCount} articles assessed.`)
  }

  return lines.slice(0, 5)
}

export function normalizeCompanyIntelligence(
  raw: ReturnTypeCompanyIntelligence,
): InstitutionalCompanyIntelligence {
  const fundamentals = raw.companyFacts
    ? normalizeSecCompanyFacts(raw.companyFacts)
    : null

  const financialHealth = fundamentals
    ? calculateFinancialHealth(fundamentals)
    : null

  const earnings = normalizeEarnings(raw.earnings)
  const news = normalizeNews(raw.news)

  return {
    ticker: raw.ticker,
    entityName:
      fundamentals?.entityName ??
      raw.companyFacts?.entityName ??
      raw.ticker,
    retrievedAt: raw.retrievedAt,
    fundamentals,
    financialHealth,
    earnings,
    news,
    filings: raw.filings.slice(0, 10).map((filing) => ({
      form: filing.form,
      filingDate: filing.filingDate,
      reportDate: filing.reportDate,
      description: filing.description,
      url: filing.url,
    })),
    providerConfidence: providerConfidence(raw),
    summary: summaryLines(
      fundamentals?.entityName ?? raw.ticker,
      fundamentals,
      financialHealth,
      earnings,
      news,
    ),
  }
}
