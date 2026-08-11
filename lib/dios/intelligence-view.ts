import type { AnalysisReport, ExternalAnalysisContext } from "./types"

export type IntelligenceItem = {
  report: AnalysisReport
  context: ExternalAnalysisContext | null
  warning: string | null
  source: "live" | "fallback"
}

export type DirectionalOutlook = "Bullish" | "Neutral" | "Bearish"

export type IntelligenceView = {
  outlook: DirectionalOutlook
  label: string
  probability: number
  dataQuality: number
  availableSignals: number
  totalSignals: number
  sourceFamilies: string[]
  explanation: string
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)))

export function getSourceFamilies(item: IntelligenceItem): string[] {
  const names = new Set<string>()
  const inspect = (raw: string) => {
    const value = raw.toLowerCase()
    if (value.includes("yahoo")) names.add("Yahoo Finance")
    else if (value.includes("alpha vantage")) names.add("Alpha Vantage")
    else if (value.includes("finnhub")) names.add("Finnhub")
    else if (value.includes("sec") || value.includes("edgar")) names.add("SEC EDGAR")
    else if (value.includes("financial modeling prep") || value.includes("fmp")) names.add("Financial Modeling Prep")
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

  const checks = [
    item.source === "live",
    report.isLivePrice,
    report.price > 0,
    Number.isFinite(report.dailyChange),
    Number.isFinite(report.overallScore),
    Number.isFinite(report.confidence),
    Object.values(report.scores ?? {}).filter(Number.isFinite).length >= 8,
    families.length >= 1,
    families.length >= 2,
    news.length >= 1,
    news.length >= 3,
    verified,
  ]
  const availableSignals = checks.filter(Boolean).length
  const dataQuality = clamp((availableSignals / checks.length) * 100)

  const positiveRecommendation = ["Strong Buy", "Buy", "Start Small", "Buy Watch"].includes(report.recommendation)
  const negativeRecommendation = ["Sell", "Avoid", "Reduce"].includes(report.recommendation)
  const technical = report.scores?.technical ?? 50
  const timing = report.scores?.timing ?? 50
  const flows = report.scores?.flows ?? 50
  const directionalScore = clamp(
    report.overallScore * 0.55 + technical * 0.2 + timing * 0.15 + flows * 0.1 +
    (positiveRecommendation ? 4 : 0) - (negativeRecommendation ? 7 : 0),
  )

  let outlook: DirectionalOutlook = "Neutral"
  if (directionalScore >= 63) outlook = "Bullish"
  else if (directionalScore <= 43) outlook = "Bearish"

  const distance = Math.abs(directionalScore - 53)
  const probability = clamp(50 + distance * 0.72 + (dataQuality - 50) * 0.12, 50, 86)

  return {
    outlook,
    label: outlook === "Neutral" ? "Neutral / no edge" : `${outlook} bias`,
    probability,
    dataQuality,
    availableSignals,
    totalSignals: checks.length,
    sourceFamilies: families,
    explanation:
      outlook === "Bullish"
        ? "The combined score, trend and timing signals lean positive. Data quality affects conviction, not whether an outlook is shown."
        : outlook === "Bearish"
          ? "Risk, trend or timing signals currently outweigh the positive factors."
          : "The available data supports an assessment, but the positive and negative signals are too balanced for a clear edge.",
  }
}

export function rankOpportunity(item: IntelligenceItem): number {
  const view = buildIntelligenceView(item)
  const outlookBonus = view.outlook === "Bullish" ? 10 : view.outlook === "Neutral" ? 2 : -8
  return item.report.overallScore * 0.62 + item.report.confidence * 0.18 + view.dataQuality * 0.2 + outlookBonus
}
