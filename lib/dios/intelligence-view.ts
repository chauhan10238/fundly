import type { AnalysisReport, ExternalAnalysisContext } from "./types"

export type IntelligenceItem = {
  report: AnalysisReport
  context: ExternalAnalysisContext | null
  warning: string | null
  source: "live" | "fallback"
}

export type DirectionalOutlook = "Bullish" | "Neutral" | "Bearish"
export type RiskLevel = "Low" | "Medium" | "High"

export type HorizonView = {
  outlook: DirectionalOutlook
  probability: number
  score: number
}

export type IntelligenceView = {
  outlook: DirectionalOutlook
  label: string
  probability: number
  reliability: number
  dataQuality: number
  availableSignals: number
  totalSignals: number
  sourceFamilies: string[]
  risk: RiskLevel
  today: HorizonView
  shortTerm: HorizonView
  mediumTerm: HorizonView
  explanation: string
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)))

function outlookFromScore(score: number): DirectionalOutlook {
  if (score >= 63) return "Bullish"
  if (score <= 43) return "Bearish"
  return "Neutral"
}

function probabilityFromScore(score: number, quality: number, ceiling = 86) {
  const distance = Math.abs(score - 53)
  return clamp(50 + distance * 0.72 + (quality - 50) * 0.12, 50, ceiling)
}

export function getSourceFamilies(item: IntelligenceItem): string[] {
  const names = new Set<string>()
  const inspect = (raw: string) => {
    const value = raw.toLowerCase()
    if (value.includes("yahoo")) names.add("Yahoo Finance")
    else if (value.includes("alpha vantage")) names.add("Alpha Vantage")
    else if (value.includes("finnhub")) names.add("Finnhub")
    else if (value.includes("sec") || value.includes("edgar")) names.add("SEC EDGAR")
    else if (value.includes("financial modeling prep") || value.includes("fmp")) names.add("Financial Modeling Prep")
    else if (value.includes("fred")) names.add("FRED")
  }

  for (const source of item.report.sources ?? []) inspect(`${source.name} ${source.url}`)
  for (const source of item.context?.sources ?? []) inspect(`${source.name} ${source.url}`)
  for (const article of item.context?.news ?? []) {
    if (article.source?.trim()) names.add(article.source.trim())
  }
  return [...names]
}

export function buildIntelligenceView(item: IntelligenceItem): IntelligenceView {
  const report = item.report
  const families = getSourceFamilies(item)
  const warnings = item.context?.warnings ?? []
  const news = item.context?.news ?? []
  const verified = !warnings.some((warning) =>
    warning.toLowerCase().includes("not yet been independently verified"),
  )

  const scoreValues = Object.values(report.scores ?? {}).filter(Number.isFinite)
  const checks = [
    item.source === "live",
    report.isLivePrice,
    report.price > 0,
    Number.isFinite(report.dailyChange),
    Number.isFinite(report.overallScore),
    Number.isFinite(report.confidence),
    scoreValues.length >= 8,
    families.length >= 1,
    families.length >= 2,
    news.length >= 1,
    news.length >= 3,
    verified,
  ]
  const availableSignals = checks.filter(Boolean).length
  const dataQuality = clamp((availableSignals / checks.length) * 100)

  const scores = report.scores
  const positiveRecommendation = ["Strong Buy", "Buy", "Start Small", "Buy Watch"].includes(report.recommendation)
  const negativeRecommendation = ["Sell", "Avoid", "Reduce"].includes(report.recommendation)

  // Today gives the most weight to observable price action and timing.
  const todayScore = clamp(
    (scores?.technical ?? 50) * 0.38 +
    (scores?.timing ?? 50) * 0.28 +
    (scores?.flows ?? 50) * 0.18 +
    (scores?.psychology ?? 50) * 0.08 +
    clamp(50 + report.dailyChange * 6) * 0.08,
  )

  // 1–3 days retains tactical signals but adds the wider DIOS decision score.
  const shortScore = clamp(
    report.overallScore * 0.46 +
    (scores?.technical ?? 50) * 0.21 +
    (scores?.timing ?? 50) * 0.16 +
    (scores?.flows ?? 50) * 0.1 +
    (scores?.macro ?? 50) * 0.07 +
    (positiveRecommendation ? 4 : 0) -
    (negativeRecommendation ? 7 : 0),
  )

  // 1–4 weeks deliberately reduces the influence of a single daily move.
  const mediumScore = clamp(
    report.overallScore * 0.36 +
    (scores?.fundamentals ?? 50) * 0.17 +
    (scores?.quality ?? 50) * 0.14 +
    (scores?.valuation ?? 50) * 0.11 +
    (scores?.earnings ?? 50) * 0.1 +
    (scores?.macro ?? 50) * 0.07 +
    (scores?.technical ?? 50) * 0.05,
  )

  const today: HorizonView = {
    score: todayScore,
    outlook: outlookFromScore(todayScore),
    probability: probabilityFromScore(todayScore, dataQuality, 82),
  }
  const shortTerm: HorizonView = {
    score: shortScore,
    outlook: outlookFromScore(shortScore),
    probability: probabilityFromScore(shortScore, dataQuality, 86),
  }
  const mediumTerm: HorizonView = {
    score: mediumScore,
    outlook: outlookFromScore(mediumScore),
    probability: probabilityFromScore(mediumScore, dataQuality, 88),
  }

  const riskPoints =
    (report.mainRisk ? 12 : 0) +
    report.concentrationWarnings.length * 10 +
    (item.source === "fallback" ? 18 : 0) +
    (Math.abs(report.dailyChange) >= 3 ? 15 : Math.abs(report.dailyChange) >= 1.5 ? 8 : 0) +
    (scores?.timing ?? 50) < 40 ? 12 : 0
  const risk: RiskLevel = riskPoints >= 38 ? "High" : riskPoints >= 20 ? "Medium" : "Low"

  // Reliability is deliberately not the same as model confidence. It blends
  // source completeness with the model's own confidence and penalises fallback.
  const reliability = clamp(
    dataQuality * 0.55 + report.confidence * 0.45 - (item.source === "fallback" ? 12 : 0),
  )

  return {
    outlook: shortTerm.outlook,
    label: shortTerm.outlook === "Neutral" ? "Neutral / no edge" : `${shortTerm.outlook} bias`,
    probability: shortTerm.probability,
    reliability,
    dataQuality,
    availableSignals,
    totalSignals: checks.length,
    sourceFamilies: families,
    risk,
    today,
    shortTerm,
    mediumTerm,
    explanation:
      shortTerm.outlook === "Bullish"
        ? "The combined score, trend and timing signals lean positive. Data quality affects conviction, not whether an outlook is shown."
        : shortTerm.outlook === "Bearish"
          ? "Risk, trend or timing signals currently outweigh the positive factors."
          : "The available data supports an assessment, but positive and negative signals are too balanced for a clear short-term edge.",
  }
}

export function rankOpportunity(item: IntelligenceItem): number {
  const view = buildIntelligenceView(item)
  const outlookBonus = view.outlook === "Bullish" ? 10 : view.outlook === "Neutral" ? 2 : -8
  const riskPenalty = view.risk === "High" ? 8 : view.risk === "Medium" ? 3 : 0
  return (
    item.report.overallScore * 0.48 +
    view.probability * 0.2 +
    view.reliability * 0.17 +
    view.dataQuality * 0.15 +
    outlookBonus -
    riskPenalty
  )
}
