import { getInstrument, LEVERAGED_UNIVERSE, SCAN_UNIVERSE } from "./universe"
import { computeScores, recommend, riskAdjusted, suggestedMaxWeight, weightedScore } from "./scoring"
import type { PortfolioSummary } from "./portfolio-engine"
import type { ScanResult, Settings } from "./types"

function scanOne(ticker: string, portfolio: PortfolioSummary, settings: Settings): ScanResult | null {
  const inst = getInstrument(ticker)
  if (!inst) return null
  const held = portfolio.positions.find((p) => p.ticker === inst.ticker)
  const currentWeight = held?.weight ?? 0
  const scores = computeScores({ instrument: inst, portfolio, currentWeight, settings })
  const overall = weightedScore(scores, settings)
  const recommendation = recommend(overall, scores, inst, currentWeight, settings)
  const raScore = riskAdjusted(overall, inst.riskBand)
  const freshCatalyst = Boolean(inst.nextEvent) && scores.earnings >= 70

  return {
    rank: 0,
    ticker: inst.ticker,
    name: inst.name,
    type: inst.type,
    overallScore: overall,
    riskAdjustedScore: raScore,
    recommendation,
    whyToday: whyToday(inst, scores, overall),
    suggestedMaxWeight: suggestedMaxWeight(inst, overall, settings),
    mainRisk: mainRisk(inst, scores),
    tags: inst.tags,
    riskBand: inst.riskBand,
    freshCatalyst,
  }
}

function whyToday(inst: ReturnType<typeof getInstrument> & object, s: ReturnType<typeof computeScores>, overall: number): string {
  if (s.technical >= 80) return "Strong trend and institutional flow"
  if (s.valuation >= 65) return "Attractive valuation vs history"
  if (s.macro >= 65) return "Macro tailwind for the profile"
  if (overall >= 65) return "Broad-based quality at fair price"
  return "Neutral setup — monitor"
}

function mainRisk(inst: ReturnType<typeof getInstrument> & object, s: ReturnType<typeof computeScores>): string {
  if (inst.leveraged) return "Leverage decay / path dependency"
  if (s.geopolitics < 45) return "Geopolitical / supply-chain risk"
  if (s.valuation < 40) return "Valuation / de-rating risk"
  if (inst.riskBand === "high") return "High volatility / cyclicality"
  if (s.macro < 50) return "Rate / macro sensitivity"
  return "Concentration within held themes"
}

export interface ScanOutput {
  ranked: ScanResult[]
  topOpportunities: ScanResult[]
  topWatchlist: ScanResult[]
  holdingsAttention: ScanResult[]
  avoidList: ScanResult[]
  noActionList: ScanResult[]
  tactical: ScanResult[]
}

export function runScan(portfolio: PortfolioSummary, settings: Settings): ScanOutput {
  const ranked = SCAN_UNIVERSE.map((t) => scanOne(t, portfolio, settings))
    .filter((r): r is ScanResult => r !== null)
    .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
    .map((r, i) => ({ ...r, rank: i + 1 }))

  const tactical = LEVERAGED_UNIVERSE.map((t) => scanOne(t, portfolio, settings))
    .filter((r): r is ScanResult => r !== null)
    .map((r, i) => ({ ...r, rank: i + 1 }))

  const heldTickers = new Set(portfolio.positions.map((p) => p.ticker))

  return {
    ranked,
    topOpportunities: ranked.slice(0, 10),
    topWatchlist: ranked
      .filter((r) => r.type === "stock" && !heldTickers.has(r.ticker))
      .slice(0, 10),
    holdingsAttention: ranked.filter(
      (r) => heldTickers.has(r.ticker) && ["Reduce", "Sell", "Buy Watch", "Avoid"].includes(r.recommendation),
    ),
    avoidList: ranked.filter((r) => r.recommendation === "Avoid" || r.recommendation === "Sell"),
    noActionList: ranked.filter((r) => r.recommendation === "Hold" || r.recommendation === "No Action"),
    tactical,
  }
}
