import type { Instrument, ScoreSet, Scenarios } from "./types"

export type Horizon = "6M" | "1Y" | "3Y" | "5Y"

export const HORIZONS: { key: Horizon; label: string; months: number }[] = [
  { key: "6M", label: "6 months", months: 6 },
  { key: "1Y", label: "1 year", months: 12 },
  { key: "3Y", label: "3 years", months: 36 },
  { key: "5Y", label: "5 years", months: 60 },
]

export function buildScenarios(inst: Instrument, scores: ScoreSet, overall: number): Scenarios {
  const growth = inst.growthHint / 100
  const valuation = inst.valuationHint / 100
  const risk = inst.riskBand === "high" ? 1.35 : inst.riskBand === "medium" ? 1 : 0.7

  // annualised base expectation, blended from growth/valuation/quality
  const baseAnnual = 0.05 + growth * 0.12 + (valuation - 0.5) * 0.08

  const bullProb = Math.round(clamp(20 + (overall - 50) * 0.5, 15, 45))
  const bearProb = Math.round(clamp(30 - (overall - 50) * 0.35, 15, 40))
  const baseProb = 100 - bullProb - bearProb

  return {
    bull: {
      probability: bullProb,
      low: (baseAnnual + 0.08) * risk,
      high: (baseAnnual + 0.2) * risk,
      assumptions: bullAssumptions(inst),
    },
    base: {
      probability: baseProb,
      low: baseAnnual - 0.03,
      high: baseAnnual + 0.05,
      assumptions: baseAssumptions(inst),
    },
    bear: {
      probability: bearProb,
      low: (-0.12 - 0.1) * risk,
      high: (-0.02) * risk,
      assumptions: bearAssumptions(inst),
    },
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function bullAssumptions(inst: Instrument): string[] {
  if (inst.themes?.includes("semiconductors"))
    return [
      "AI capex cycle extends with sustained data-center demand",
      "Gross margins hold above prior peak on pricing power",
      "Export-control disruption remains contained",
    ]
  if (inst.themes?.includes("gold"))
    return ["Real yields fall as easing continues", "Central-bank and safe-haven demand persists", "USD weakens further"]
  if (inst.type === "etf" && inst.tags.includes("core"))
    return ["Broad earnings growth re-accelerates", "Multiple expansion on soft-landing confidence", "Breadth improves beyond mega-caps"]
  return ["Revenue growth beats consensus", "Margin expansion continues", "Multiple re-rates toward peers"]
}

function baseAssumptions(inst: Instrument): string[] {
  if (inst.type === "etf" && inst.tags.includes("core"))
    return ["Mid-single-digit earnings growth", "Stable multiples", "Dividends reinvested"]
  return ["In-line earnings delivery", "Stable valuation multiple", "No major macro shock"]
}

function bearAssumptions(inst: Instrument): string[] {
  if (inst.themes?.includes("semiconductors"))
    return ["AI capex digestion / inventory correction", "Export controls tighten", "Cyclical demand rolls over"]
  if (inst.themes?.includes("rates") || inst.themes?.includes("duration"))
    return ["Inflation reaccelerates", "Fed pauses or resumes hikes", "Term premium rises"]
  return ["Earnings miss and guidance cut", "Multiple compression", "Macro or liquidity shock"]
}

// Build indexed-to-100 paths for the chart across the selected horizon.
export function scenarioPaths(scenarios: Scenarios, horizon: Horizon) {
  const months = HORIZONS.find((h) => h.key === horizon)!.months
  const steps = Math.min(months, 24)
  const stepMonths = months / steps

  const annualToStep = (annual: number) => Math.pow(1 + annual, stepMonths / 12) - 1

  const mid = (lo: number, hi: number) => (lo + hi) / 2
  const bullRate = annualToStep(mid(scenarios.bull.low, scenarios.bull.high))
  const baseRate = annualToStep(mid(scenarios.base.low, scenarios.base.high))
  const bearRate = annualToStep(mid(scenarios.bear.low, scenarios.bear.high))

  const data: { t: string; bull: number; base: number; bear: number }[] = []
  let bull = 100, base = 100, bear = 100
  data.push({ t: "Now", bull: 100, base: 100, bear: 100 })
  for (let i = 1; i <= steps; i++) {
    bull *= 1 + bullRate
    base *= 1 + baseRate
    bear *= 1 + bearRate
    const label = months <= 12 ? `M${Math.round(i * stepMonths)}` : `Y${((i * stepMonths) / 12).toFixed(1)}`
    data.push({
      t: label,
      bull: Math.round(bull * 10) / 10,
      base: Math.round(base * 10) / 10,
      bear: Math.round(bear * 10) / 10,
    })
  }
  return data
}
