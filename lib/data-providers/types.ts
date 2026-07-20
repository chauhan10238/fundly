export type ProviderName = "FRED" | "EIA" | "Alpha Vantage" | "Finnhub" | "SEC EDGAR"

export type ProviderResult<T> =
  | { ok: true; provider: ProviderName; data: T; retrievedAt: string; sourceUrl: string }
  | { ok: false; provider: ProviderName; error: string; retrievedAt: string; sourceUrl?: string }

export interface MacroObservation { seriesId: string; label: string; date: string; value: number; previousValue?: number; change?: number; units?: string }
export interface EnergyObservation { seriesId: string; label: string; period: string; value: number; units?: string }
export interface VerifiedQuote { symbol: string; price: number; previousClose?: number; change?: number; changePercent?: number; latestTradingDay?: string }
export interface ProviderNewsItem { title: string; url: string; source: string; publishedAt: string; summary?: string; sentiment: "positive" | "neutral" | "negative"; sentimentScore?: number }
export interface EarningsEvent { symbol: string; date: string; hour?: string; epsEstimate?: number; epsActual?: number; revenueEstimate?: number; revenueActual?: number; quarter?: number; year?: number }
export interface SecTickerRecord { cik: string; ticker: string; title: string }
export interface SecFiling { accessionNumber: string; filingDate: string; reportDate?: string; form: string; primaryDocument: string; description?: string; url: string }
export interface SecCompanyFacts { cik: string; entityName: string; facts: Record<string, unknown> }
export interface ProviderHealth { provider: ProviderName; configured: boolean; ok: boolean; message: string; checkedAt: string }
