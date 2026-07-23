import type { AnalysisReport, ExternalAnalysisContext } from "./types"

export type TacticalOutlook = {
  direction: "Bullish" | "Neutral" | "Bearish"
  low: number
  high: number
  confidence: number
  horizon: "next session" | "1–2 trading days"
  evidence: string[]
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value))
}

/**
 * A transparent short-horizon model estimate, not a guaranteed forecast.
 * It combines DIOS score, live daily momentum and multi-source news sentiment.
 */
export function buildTacticalOutlook(
  report: AnalysisReport,
  context: ExternalAnalysisContext | null,
): TacticalOutlook {
  const articles = context?.news ?? []
  const positive = articles.filter((item) => item.sentiment === "positive").length
  const negative = articles.filter((item) => item.sentiment === "negative").length
  const newsBalance = articles.length ? (positive - negative) / articles.length : 0
  const scoreSignal = (report.overallScore - 50) / 50
  const momentumSignal = clamp(report.dailyChange / 4, -1, 1)
  const combined = scoreSignal * 0.5 + momentumSignal * 0.3 + newsBalance * 0.2

  const centre = clamp(combined * 1.6, -2.5, 2.5)
  const width = report.instrumentType === "etf" ? 0.9 : 1.35
  const low = Number((centre - width).toFixed(1))
  const high = Number((centre + width).toFixed(1))
  const confidence = clamp(
    Math.round(report.confidence * 0.65 + Math.min(articles.length, 8) * 3 + (context?.sources.length ?? 0) * 2),
    35,
    92,
  )

  const direction = centre > 0.45 ? "Bullish" : centre < -0.45 ? "Bearish" : "Neutral"
  const evidence = [
    `DIOS composite score ${report.overallScore}/100`,
    `Current session move ${report.dailyChange >= 0 ? "+" : ""}${report.dailyChange.toFixed(2)}%`,
    articles.length
      ? `News balance: ${positive} positive, ${negative} negative across ${articles.length} article(s)`
      : "No current provider news returned",
    `${context?.sources.length ?? report.sources.length} cited source record(s)`,
  ]

  return { direction, low, high, confidence, horizon: "1–2 trading days", evidence }
}
