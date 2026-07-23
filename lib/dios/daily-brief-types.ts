export type DailyBriefHoldingInput = {
  ticker: string
  weight?: number
  marketValue?: number
  dayChangeValue?: number
  dayChangePct?: number
  unrealisedPL?: number
  unrealisedPLPct?: number
}

export type DailyBriefRequest = {
  holdings: DailyBriefHoldingInput[]
  scanSymbols?: string[]
}

export type BriefMarketItem = {
  symbol: string
  label: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  provider: string
}

export type BriefHolding = {
  ticker: string
  score: number
  confidence: number
  recommendation: string
  todayBias: "Bullish" | "Neutral" | "Bearish"
  shortOutlook: "Bullish" | "Neutral" | "Bearish"
  mediumOutlook: "Bullish" | "Neutral" | "Bearish"
  risk: "Low" | "Medium" | "High"
  dataQuality: number
  availableSignals: number
  totalSignals: number
  price: number
  changePercent: number
  weight: number
  reasons: string[]
  warnings: string[]
}

export type BriefOpportunity = {
  ticker: string
  score: number
  confidence: number
  dataQuality: number
  outlook: "Bullish" | "Neutral" | "Bearish"
  horizon: string
  reasons: string[]
}

export type DailyBriefResponse = {
  generatedAt: string
  asOfDate: string
  status: "live" | "partial"
  market: {
    items: BriefMarketItem[]
    regime: "Risk-on" | "Balanced" | "Risk-off"
    summary: string
  }
  portfolio: {
    healthScore: number
    marketAlignment: number
    diversification: number
    riskScore: number
    dailyChangeValue: number
    dailyChangePct: number
    holdings: BriefHolding[]
  }
  opportunities: BriefOpportunity[]
  risks: string[]
  actions: string[]
  sourceSummary: {
    sourceFamilies: string[]
    liveHoldings: number
    totalHoldings: number
  }
  warnings: string[]
}
