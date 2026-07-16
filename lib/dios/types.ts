// DIOS core domain types

export type InstrumentType = "stock" | "etf"

export type Recommendation =
  | "Strong Buy"
  | "Buy"
  | "Start Small"
  | "Buy Watch"
  | "Hold"
  | "Reduce"
  | "Sell"
  | "Avoid"
  | "No Action"

export type RiskBand = "low" | "medium" | "high"

export type UniverseTag =
  | "core"
  | "sector"
  | "defensive"
  | "income"
  | "growth"
  | "commodity"
  | "tactical"

export type ScoreKey =
  | "macro"
  | "geopolitics"
  | "earnings"
  | "fundamentals"
  | "valuation"
  | "quality"
  | "flows"
  | "technical"
  | "portfolioFit"
  | "timing"
  | "psychology"
  | "opportunityCost"

export type ScoreSet = Record<ScoreKey, number>

export interface Instrument {
  ticker: string
  name: string
  type: InstrumentType
  sector: string
  industry: string
  country: string
  currency: string
  tags: UniverseTag[]
  riskBand: RiskBand
  leveraged?: boolean
  // demo pricing
  price: number
  prevClose: number
  // valuation / quality hints used by the deterministic engine (0-100)
  qualityHint: number
  valuationHint: number // higher = cheaper / more attractive
  growthHint: number
  momentumHint: number
  // look-through holdings for ETFs: map of underlying ticker -> weight (0-1)
  holdings?: Record<string, number>
  // themes for exposure analytics
  themes?: string[]
  nextEvent?: string
  nextEventDate?: string
}

export interface Holding {
  ticker: string
  quantity: number
  avgCost: number
}

export type TransactionType =
  | "Buy"
  | "Sell"
  | "Dividend"
  | "Fee"
  | "Deposit"
  | "Withdrawal"

export interface Transaction {
  id: string
  date: string
  ticker: string
  type: TransactionType
  quantity: number
  price: number
  currency: string
  brokerageFee: number
  fxFee: number
  notes?: string
}

export interface Scenario {
  probability: number
  low: number // expected return low (decimal, e.g. 0.12)
  high: number
  assumptions: string[]
}

export interface Scenarios {
  bull: Scenario
  base: Scenario
  bear: Scenario
}

export interface SourceCitation {
  id: string
  name: string
  date: string
  url: string
  retrieved: string
}

export interface Alternative {
  ticker: string
  name: string
  score: number
  risk: RiskBand
  valuation: string
  diversification: string
  portfolioFit: string
  expectedReturn: string
  rationale: string
}

export interface PortfolioImpact {
  currentWeight: number
  proposedWeight: number
  sectorExposureBefore: number
  sectorExposureAfter: number
  directOverlap: string[]
  lookThroughOverlap: string[]
  countryOverlap: string[]
  correlation: number
  diversificationBenefit: string
  concentrationNote: string
  ownsAnalysed: boolean
}

export interface AnalysisReport {
  ticker: string
  name: string
  instrumentType: InstrumentType
  price: number
  dailyChange: number
  overallScore: number
  recommendation: Recommendation
  confidence: number
  suggestedMaxWeight: number
  currentWeight: number
  proposedWeight: number
  horizon: string
  lastUpdated: string
  modelVersion: string
  scoringVersion: string
  scores: ScoreSet
  whyToday: string[]
  whyNotToday: string[]
  whyNotWait: string[]
  recentChanges: string[]
  betterEntryConditions: string[]
  thesisInvalidation: string[]
  alternatives: Alternative[]
  scenarios: Scenarios
  portfolioImpact: PortfolioImpact
  sources: SourceCitation[]
  dataComplete: boolean
}

export interface ScoringWeights {
  macro: number
  geopolitics: number
  earnings: number
  fundamentals: number
  valuation: number
  quality: number
  flows: number
  technical: number
  portfolioFit: number
  timing: number
  psychology: number
  opportunityCost: number
}

export interface Settings {
  currency: string
  defaultHorizon: string
  maxStockWeight: number
  maxSectorEtfWeight: number
  maxSectorExposure: number
  maxLeveragedWeight: number
  minBuyScore: number
  minStrongBuyScore: number
  riskTolerance: RiskBand
  weights: ScoringWeights
  dataRefreshMinutes: number
  marketDataProvider: string
}

export interface ScanResult {
  rank: number
  ticker: string
  name: string
  type: InstrumentType
  overallScore: number
  riskAdjustedScore: number
  recommendation: Recommendation
  whyToday: string
  suggestedMaxWeight: number
  mainRisk: string
  tags: UniverseTag[]
  riskBand: RiskBand
  freshCatalyst: boolean
}

export interface EarningsEvent {
  ticker: string
  name: string
  date: string
  time: "BMO" | "AMC"
  expectedMove: number
  epsConsensus: number
  revenueConsensus: string
  affectsPortfolio: boolean
  inEtfs: string[]
  recommendation: string
  reported?: EarningsResult
}

export interface EarningsResult {
  revenueVsConsensus: number
  epsVsConsensus: number
  grossMargin: number
  operatingMargin: number
  guidance: "raised" | "maintained" | "cut"
  commentary: string
  ripple: RippleImpact[]
}

export interface RippleImpact {
  ticker: string
  direction: "positive" | "neutral" | "negative"
  impactScore: number // -10..+10
  explanation: string
  evidence: string
  duration: string
}

export interface RecommendationRecord {
  id: string
  datetime: string
  ticker: string
  type: InstrumentType
  priceAtRec: number
  overallScore: number
  recommendation: Recommendation
  suggestedWeight: number
  confidence: number
  reasons: string[]
  risks: string[]
  scenarios: Scenarios
  modelVersion: string
  scoringVersion: string
  sector: string
  macroRegime: string
  outcomes: {
    d1: number | null
    w1: number | null
    m1: number | null
    m3: number | null
    m6: number | null
    m12: number | null
  }
}
