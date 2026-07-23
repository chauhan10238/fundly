import type {
  AnalysisReport,
  ExternalAnalysisContext,
  Recommendation,
} from "./types"

type CalibrationInput = {
  report: AnalysisReport
  context: ExternalAnalysisContext | null
  usedFallback: boolean
}

const POSITIVE: Recommendation[] = [
  "Strong Buy",
  "Buy",
  "Start Small",
  "Buy Watch",
]

function sourceFamilies(context: ExternalAnalysisContext | null): string[] {
  if (!context) return []

  const families = new Set<string>()

  for (const source of context.sources ?? []) {
    const value = `${source.name} ${source.url}`.toLowerCase()
    if (value.includes("yahoo")) families.add("Yahoo Finance")
    if (value.includes("alpha vantage")) families.add("Alpha Vantage")
    if (value.includes("finnhub")) families.add("Finnhub")
    if (value.includes("sec") || value.includes("edgar")) families.add("SEC EDGAR")
    if (value.includes("financial modeling prep")) families.add("Financial Modeling Prep")
  }

  for (const article of context.news ?? []) {
    if (article.source) families.add(article.source.trim())
  }

  return [...families]
}

function daysUntil(date?: string) {
  if (!date) return null
  const timestamp = Date.parse(`${date.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(timestamp)) return null
  return Math.ceil((timestamp - Date.now()) / 86_400_000)
}

function weakerPositiveRecommendation(
  current: Recommendation,
  severe: boolean,
): Recommendation {
  if (!POSITIVE.includes(current)) return current
  if (severe) return current === "Buy Watch" ? "Hold" : "Buy Watch"
  if (current === "Strong Buy") return "Buy"
  if (current === "Buy") return "Start Small"
  return current
}

/**
 * Risk calibration sits after the DIOS scoring model.
 *
 * A high model score is not allowed to become a confident short-term Buy unless
 * the live evidence is sufficiently diverse and current. This prevents static
 * universe hints, one news feed, or one quote provider from creating false
 * certainty.
 */
export function calibrateLiveDecision({
  report,
  context,
  usedFallback,
}: CalibrationInput): AnalysisReport {
  const families = sourceFamilies(context)
  const warnings = context?.warnings ?? []
  const upcomingEarningsDays = daysUntil(context?.earnings?.date)
  const positiveNews = context?.news.filter((item) => item.sentiment === "positive").length ?? 0
  const negativeNews = context?.news.filter((item) => item.sentiment === "negative").length ?? 0

  const reasons: string[] = []
  let confidenceCap = 100
  let scorePenalty = 0
  let severe = false

  if (usedFallback || !context) {
    confidenceCap = Math.min(confidenceCap, 30)
    scorePenalty += 18
    severe = true
    reasons.push("Live multi-source evidence was unavailable; static fallback data cannot support a new Buy decision.")
  }

  if (families.length < 2) {
    confidenceCap = Math.min(confidenceCap, 38)
    scorePenalty += 12
    severe = true
    reasons.push("Fewer than two independent source families were available.")
  } else if (families.length < 3) {
    confidenceCap = Math.min(confidenceCap, 52)
    scorePenalty += 6
    reasons.push("Only two independent source families were available; confidence was capped.")
  }

  const unverifiedQuote = warnings.some((warning) =>
    warning.toLowerCase().includes("not yet been independently verified"),
  )
  if (unverifiedQuote) {
    confidenceCap = Math.min(confidenceCap, 45)
    scorePenalty += 5
    reasons.push("The live price was not independently verified.")
  }

  if (Math.abs(report.dailyChange) >= 7) {
    confidenceCap = Math.min(confidenceCap, 35)
    scorePenalty += 15
    severe = true
    reasons.push("The security has already moved at least 7% today; gap and reversal risk are elevated.")
  } else if (Math.abs(report.dailyChange) >= 4) {
    confidenceCap = Math.min(confidenceCap, 48)
    scorePenalty += 8
    reasons.push("The security has already moved at least 4% today; chasing risk is elevated.")
  }

  if (
    upcomingEarningsDays !== null &&
    upcomingEarningsDays >= 0 &&
    upcomingEarningsDays <= 3
  ) {
    confidenceCap = Math.min(confidenceCap, 42)
    scorePenalty += 10
    severe = true
    reasons.push(`Earnings are due in ${upcomingEarningsDays} day(s); overnight gap risk is material.`)
  }

  if (negativeNews >= positiveNews + 2) {
    confidenceCap = Math.min(confidenceCap, 45)
    scorePenalty += 8
    reasons.push("Recent negative headlines materially outnumber positive headlines.")
  }

  const adjustedScore = Math.max(0, Math.round(report.overallScore - scorePenalty))
  let recommendation = weakerPositiveRecommendation(report.recommendation, severe)

  if (adjustedScore < 55 && POSITIVE.includes(recommendation)) {
    recommendation = "Hold"
  } else if (adjustedScore < 65 && ["Strong Buy", "Buy"].includes(recommendation)) {
    recommendation = "Buy Watch"
  }

  const confidence = Math.max(
    10,
    Math.min(report.confidence, confidenceCap),
  )

  const dataComplete =
    !usedFallback &&
    families.length >= 3 &&
    !unverifiedQuote &&
    warnings.length === 0

  const sourceNote = families.length
    ? `Evidence checked across ${families.length} source families: ${families.slice(0, 5).join(", ")}.`
    : "No independent live source families were available."

  return {
    ...report,
    overallScore: adjustedScore,
    recommendation,
    confidence,
    dataComplete,
    strongestReasons: [
      sourceNote,
      ...report.strongestReasons,
    ].slice(0, 5),
    whyNotToday: [
      ...reasons,
      ...report.whyNotToday,
    ].slice(0, 8),
    mainRisk: reasons[0] ?? report.mainRisk,
    decisionChangeCondition:
      reasons.length > 0
        ? "Reassess after source agreement improves, volatility settles, or the event risk passes."
        : report.decisionChangeCondition,
  }
}
