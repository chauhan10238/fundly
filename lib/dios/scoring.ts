import type {
  Instrument,
  Recommendation,
  RiskBand,
  ScoreKey,
  ScoreSet,
  Settings,
} from "./types"
import { GEO, MACRO } from "./macro"
import type { PortfolioSummary } from "./portfolio-engine"

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)))

export const SCORE_LABELS: Record<ScoreKey, string> = {
  macro: "Macro environment",
  geopolitics: "Geopolitics",
  earnings: "Earnings & guidance",
  fundamentals: "Fundamentals",
  valuation: "Valuation",
  quality: "Business / ETF quality",
  flows: "Institutional flow",
  technical: "Technical trend",
  portfolioFit: "Portfolio fit",
  timing: "Timing",
  psychology: "Psychology / behaviour",
  opportunityCost: "Opportunity cost",
}

export interface ScoringContext {
  instrument: Instrument
  portfolio: PortfolioSummary
  currentWeight: number
  settings: Settings
}

// Sensitivity of a name to macro / geopolitics based on themes and risk band.
function macroSensitivity(inst: Instrument): number {
  let base = MACRO.regimeScore
  if (inst.themes?.includes("rates")) base -= 10
  if (inst.themes?.includes("duration")) base -= 6
  if (inst.themes?.includes("growth") || inst.tags.includes("growth")) base += 8
  if (inst.themes?.includes("defensive") || inst.tags.includes("defensive")) base += 4
  if (inst.themes?.includes("inflation-hedge")) base += 6
  return clamp(base)
}

function geoSensitivity(inst: Instrument): number {
  let base = GEO.score
  if (inst.country === "Taiwan") base -= 22
  if (inst.themes?.includes("semiconductors")) base -= 14
  if (inst.themes?.includes("foundry")) base -= 8
  if (inst.themes?.includes("defense")) base += 20
  if (inst.themes?.includes("gold") || inst.themes?.includes("safe-haven")) base += 16
  if (inst.themes?.includes("energy")) base += 6
  return clamp(base)
}

export function computeScores(ctx: ScoringContext): ScoreSet {
  const { instrument: inst, portfolio, currentWeight, settings } = ctx

  const macro = macroSensitivity(inst)
  const geopolitics = geoSensitivity(inst)

  // Earnings score: quality + growth blended, dampened for turnaround names
  const earnings = clamp(inst.growthHint * 0.6 + inst.qualityHint * 0.4 - (inst.themes?.includes("turnaround") ? 12 : 0))

  const fundamentals = clamp(inst.qualityHint * 0.55 + inst.growthHint * 0.45)
  const valuation = clamp(inst.valuationHint)
  const quality = clamp(inst.qualityHint)

  // Flows follow momentum + quality
  const flows = clamp(inst.momentumHint * 0.6 + inst.qualityHint * 0.4)
  const technical = clamp(inst.momentumHint)

  // Portfolio fit: penalise if it increases already-heavy sector/theme exposure
  const sectorAlloc = portfolio.exposure.sector.find((s) => s.label === inst.sector)?.pct ?? 0
  let fit = 70
  if (sectorAlloc > settings.maxSectorExposure) fit -= 30
  else if (sectorAlloc > settings.maxSectorExposure * 0.7) fit -= 16
  if (inst.themes?.includes("semiconductors") && portfolio.exposure.semiconductor > 20) fit -= 18
  if (inst.type === "etf" && (inst.tags.includes("core") || inst.sector === "Diversified")) fit += 18
  if (inst.tags.includes("defensive")) fit += 8
  if (currentWeight > settings.maxStockWeight && inst.type === "stock") fit -= 15
  const portfolioFit = clamp(fit)

  // Timing: momentum vs valuation balance
  const timing = clamp((inst.momentumHint + inst.valuationHint) / 2)

  // Psychology: behavioural risk of chasing; lower if extremely hot
  const psychology = clamp(inst.momentumHint > 85 ? 45 : 68 - (inst.riskBand === "high" ? 12 : 0))

  // Opportunity cost: relative to broad market attractiveness
  const opportunityCost = clamp(inst.growthHint * 0.4 + inst.valuationHint * 0.6)

  return {
    macro,
    geopolitics,
    earnings,
    fundamentals,
    valuation,
    quality,
    flows,
    technical,
    portfolioFit,
    timing,
    psychology,
    opportunityCost,
  }
}

export function weightedScore(scores: ScoreSet, settings: Settings): number {
  const w = settings.weights
  const totalWeight =
    w.macro + w.geopolitics + w.earnings + w.fundamentals + w.valuation + w.quality +
    w.flows + w.technical + w.portfolioFit + w.timing + w.psychology + w.opportunityCost
  const sum =
    scores.macro * w.macro +
    scores.geopolitics * w.geopolitics +
    scores.earnings * w.earnings +
    scores.fundamentals * w.fundamentals +
    scores.valuation * w.valuation +
    scores.quality * w.quality +
    scores.flows * w.flows +
    scores.technical * w.technical +
    scores.portfolioFit * w.portfolioFit +
    scores.timing * w.timing +
    scores.psychology * w.psychology +
    scores.opportunityCost * w.opportunityCost
  return clamp(totalWeight ? sum / totalWeight : 0)
}

export function recommend(
  overall: number,
  scores: ScoreSet,
  inst: Instrument,
  currentWeight: number,
  settings: Settings,
): Recommendation {
  const overweight =
    (inst.type === "stock" && currentWeight > 10) ||
    (inst.leveraged && currentWeight > 3)

  if (overweight) return "Reduce"
  if (overall < 40) return "Avoid"
  if (overall < 50) return scores.technical < 45 ? "Sell" : "Reduce"
  if (overall < 58) return "Hold"

  // A falling price alone never creates a buy recommendation. The model still
  // requires acceptable fundamentals, portfolio fit and valuation.
  if (scores.fundamentals < 55 || scores.quality < 50) return "Hold"
  if (scores.portfolioFit < 45) return currentWeight > 0 ? "Reduce" : "No Action"
  if (overall >= settings.minBuyScore && scores.timing >= 55 && scores.valuation >= 45) return "Buy"
  if (overall >= 60) return "Buy Watch"
  return "Hold"
}

export function confidenceScore(scores: ScoreSet, dataComplete: boolean): number {
  const values = Object.values(scores)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  const std = Math.sqrt(variance)
  // lower dispersion -> higher confidence
  let conf = clamp(88 - std)
  if (!dataComplete) conf = clamp(conf - 25)
  return conf
}

export function suggestedMaxWeight(inst: Instrument, overall: number, settings: Settings): number {
  if (inst.leveraged) return settings.maxLeveragedWeight
  let cap = inst.type === "etf"
    ? (inst.tags.includes("core") || inst.sector === "Diversified" ? 40 : settings.maxSectorEtfWeight)
    : settings.maxStockWeight
  // scale by conviction
  const scaled = cap * (0.5 + (overall / 100) * 0.5)
  return Math.round(scaled * 10) / 10
}

export function riskAdjusted(overall: number, band: RiskBand): number {
  const penalty = band === "high" ? 12 : band === "medium" ? 5 : 0
  return clamp(overall - penalty)
}
