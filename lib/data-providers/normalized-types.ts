export interface FinancialMetric {
  value?: number
  period?: string
  filed?: string
  form?: string
  unit?: string
}

export interface GrowthMetric {
  current?: number
  previous?: number
  changePercent?: number
}

export interface NormalizedFundamentals {
  entityName: string
  currency: string
  revenueTTM?: number
  revenueGrowth?: GrowthMetric
  grossProfitTTM?: number
  operatingIncomeTTM?: number
  netIncomeTTM?: number
  netIncomeGrowth?: GrowthMetric
  operatingCashFlowTTM?: number
  capitalExpenditureTTM?: number
  freeCashFlowTTM?: number
  cash?: number
  totalDebt?: number
  assets?: number
  liabilities?: number
  equity?: number
  sharesOutstanding?: number
  epsDilutedTTM?: number
  bookValuePerShare?: number
  grossMargin?: number
  operatingMargin?: number
  profitMargin?: number
  freeCashFlowMargin?: number
  returnOnEquity?: number
  debtToEquity?: number
  currentRatio?: number
  sourcePeriod?: string
  latestFiled?: string
}

export interface HealthPillar {
  name: "Profitability" | "Cash Flow" | "Balance Sheet" | "Growth" | "Efficiency"
  score: number
  status: "strong" | "healthy" | "watch" | "weak"
  explanation: string
}

export interface FinancialHealth {
  score: number
  label: "Excellent" | "Strong" | "Fair" | "Weak"
  pillars: HealthPillar[]
  strengths: string[]
  risks: string[]
}

export interface NormalizedEarnings {
  nextDate?: string
  daysUntil?: number
  timing?: string
  epsEstimate?: number
  revenueEstimate?: number
  latestActualDate?: string
  latestEpsActual?: number
  latestEpsEstimate?: number
  latestEpsSurprisePercent?: number
  latestRevenueActual?: number
  latestRevenueEstimate?: number
  latestRevenueSurprisePercent?: number
}

export interface NewsTheme {
  theme: string
  mentions: number
  sentiment: "positive" | "neutral" | "negative"
}

export interface NewsIntelligence {
  articleCount: number
  positiveCount: number
  neutralCount: number
  negativeCount: number
  sentiment: "positive" | "neutral" | "negative"
  sentimentScore: number
  confidence: number
  themes: NewsTheme[]
  keyHeadlines: Array<{
    title: string
    source: string
    publishedAt: string
    url: string
    sentiment: "positive" | "neutral" | "negative"
  }>
}

export interface CompactFiling {
  form: string
  filingDate: string
  reportDate?: string
  description?: string
  url: string
}

export interface ProviderConfidence {
  score: number
  level: "high" | "medium" | "low"
  connected: string[]
  unavailable: string[]
  warnings: string[]
}

export interface InstitutionalCompanyIntelligence {
  ticker: string
  entityName: string
  retrievedAt: string
  fundamentals: NormalizedFundamentals | null
  financialHealth: FinancialHealth | null
  earnings: NormalizedEarnings
  news: NewsIntelligence
  filings: CompactFiling[]
  providerConfidence: ProviderConfidence
  summary: string[]
}
