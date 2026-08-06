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
  /** Verified instrument metadata for symbols outside the original demo universe. */
  instrument?: Instrument
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

export interface MarketSnapshot {
  price: number
  previousClose: number
  changePercent: number
  refreshedAt: string
  provider: string
  isLive: boolean
}


export interface LiveNewsItem {
  title: string
  publishedAt: string
  url: string
  source: string
  sentiment: "positive" | "neutral" | "negative"
  relevance: "company" | "sector" | "macro" | "geopolitics"
}

export interface LiveEarningsContext {
  date: string
  epsEstimated?: number
  epsActual?: number
  revenueEstimated?: number
  revenueActual?: number
  isUpcoming: boolean
}

export interface LiveFundamentalContext {
  marketCap?: number
  beta?: number
  sector?: string
  industry?: string
  companyName?: string
  description?: string
}

export interface ExternalAnalysisContext {
  instrument?: Instrument
  refreshedAt: string
  news: LiveNewsItem[]
  earnings: LiveEarningsContext | null
  fundamentals: LiveFundamentalContext | null
  etfHoldings: Array<{ symbol: string; name: string; weight: number }>
  sources: SourceCitation[]
  warnings: string[]
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
  strongestReasons: string[]
  mainRisk: string
  decisionChangeCondition: string
  concentrationWarnings: string[]
  marketDataProvider: string
  isLivePrice: boolean
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


export interface InvestmentJournalEntry {
  ticker: string
  thesis: string
  targetWeight: number
  conviction: 1 | 2 | 3 | 4 | 5
  reviewDate: string
  sellRule: string
  notes: string
  updatedAt: string
}

export type RecommendationExecutionStatus =
  | "Pending" // legacy records; displayed as Awaiting Decision
  | "Awaiting Decision"
  | "Executed"
  | "Partially Executed"
  | "Watching"
  | "Ignored"
  | "Already Own"

export type RecommendationHorizon = "d1" | "w1" | "m1" | "m3" | "m6" | "m12"

export interface RecommendationMeasurement {
  horizon: RecommendationHorizon
  measuredAt: string
  returnPct: number
  benchmarkReturnPct: number | null
  alphaPct: number | null
  source: string
}

export interface RecommendationSnapshot {
  suggestedNotional?: number
  portfolioValue?: number
  currentWeight?: number
  proposedWeight?: number
  marketDataProvider?: string
  scoreBreakdown?: Partial<ScoreSet>
}

export interface ExistingHoldingBaseline {
  id: string
  ticker: string
  startDate: string
  startAt: string
  quantity: number
  avgCost: number
  baselinePrice: number
  baselineValue: number
  priceDate: string
  provider: string
  benchmarkTicker: string
  benchmarkPrice: number | null
  createdAt: string
  status: "active" | "closed"
  outcomes: Record<RecommendationHorizon, number | null>
  benchmarkOutcomes: Record<RecommendationHorizon, number | null>
  measurements: RecommendationMeasurement[]
}

export interface TrackingMetadata {
  profileId: "suren"
  timezone: string
  startDate: string
  startAt: string
  benchmark: string
  baselineVersion: number
  baselineTickers?: string[]
  baselineHoldings?: Holding[]
  baselineStatus: "pending" | "building" | "partial" | "complete"
  baselineBuiltAt?: string
  baselineMeasuredAt?: string
  baselineError?: string
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
  origin?: "logged" | "seed" | "imported"
  recordKind?: "ai-recommendation"
  executionStatus?: RecommendationExecutionStatus
  executionNotes?: string
  decisionAt?: string
  executionPrice?: number | null
  executionQuantity?: number | null
  sourceNames?: string[]
  confidenceContributors?: string[]
  trackingNotional?: number
  benchmarkTicker?: string
  benchmarkPriceAtRec?: number | null
  benchmarkOutcomes?: Record<RecommendationHorizon, number | null>
  measurements?: RecommendationMeasurement[]
  snapshot?: RecommendationSnapshot
  outcomes: Record<RecommendationHorizon, number | null>
}
