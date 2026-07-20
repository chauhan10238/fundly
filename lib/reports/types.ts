export interface ReportMetric {
  label: string
  value: string
  note?: string
}

export interface ReportPillar {
  name: string
  score: number
  explanation: string
}

export interface ReportHeadline {
  title: string
  source: string
  publishedAt: string
  url: string
  sentiment: "positive" | "neutral" | "negative"
}

export interface ReportFiling {
  form: string
  filingDate: string
  reportDate?: string
  description?: string
  url: string
}

export interface DiosShareableReport {
  version: "3.3"
  generatedAt: string
  ticker: string
  companyName: string
  price?: number
  currency?: string
  recommendation: string
  confidence: number
  overallScore?: number
  suggestedWeight?: number
  executiveSummary: string[]
  investmentReasons: string[]
  risks: string[]
  sourceConfidence: {
    score: number
    connected: string[]
    unavailable: string[]
  }
  financialHealth?: {
    score: number
    label: string
    pillars: ReportPillar[]
    strengths: string[]
    risks: string[]
  }
  financialMetrics: ReportMetric[]
  earnings: ReportMetric[]
  news: {
    sentiment: string
    sentimentScore: number
    confidence: number
    themes: Array<{ theme: string; mentions: number; sentiment: string }>
    headlines: ReportHeadline[]
  }
  filings: ReportFiling[]
  scenarios?: Array<{
    name: string
    probability?: number
    target?: number
    returnPct?: number
    description?: string
  }>
  sources: Array<{
    name: string
    date?: string
    url?: string
  }>
  disclaimer: string
}
