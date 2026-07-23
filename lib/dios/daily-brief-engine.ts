import type {
  BriefHolding,
  BriefMarketItem,
  BriefOpportunity,
  DailyBriefHoldingInput,
  DailyBriefResponse,
} from "@/lib/dios/daily-brief-types"

type AnalysisPayload = {
  snapshot?: {
    price?: number
    previousClose?: number
    changePercent?: number
    provider?: string
    isLive?: boolean
  }
  report?: {
    ticker?: string
    overallScore?: number
    confidence?: number
    recommendation?: string
    whyToday?: string[]
    whyNotToday?: string[]
    thesisInvalidation?: string[]
    scores?: Record<string, number>
  }
  context?: {
    news?: unknown[]
    sources?: Array<{ name?: string }>
    warnings?: string[]
    earnings?: { date?: string } | null
  }
  intelligence?: unknown
  error?: string
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)))

function bias(score: number): "Bullish" | "Neutral" | "Bearish" {
  if (score >= 72) return "Bullish"
  if (score <= 44) return "Bearish"
  return "Neutral"
}

function riskFrom(score: number, volatilityPenalty: number) {
  const risk = clamp(100 - score + volatilityPenalty)
  if (risk >= 65) return "High" as const
  if (risk >= 38) return "Medium" as const
  return "Low" as const
}

function sourceFamily(name: string) {
  const n = name.toLowerCase()
  if (n.includes("yahoo")) return "Yahoo Finance"
  if (n.includes("finnhub")) return "Finnhub"
  if (n.includes("alpha vantage")) return "Alpha Vantage"
  if (n.includes("sec") || n.includes("edgar")) return "SEC EDGAR"
  if (n.includes("fred")) return "FRED"
  if (n.includes("fmp") || n.includes("financial modeling")) return "FMP"
  return name.split("—")[0]?.trim() || "Other"
}

export function buildHolding(
  input: DailyBriefHoldingInput,
  payload: AnalysisPayload,
): BriefHolding | null {
  const report = payload.report
  const snapshot = payload.snapshot
  if (!report || !snapshot || typeof report.overallScore !== "number") return null

  const sources = payload.context?.sources ?? []
  const families = new Set(sources.map((item) => sourceFamily(item.name ?? "")).filter(Boolean))
  const newsCount = Array.isArray(payload.context?.news) ? payload.context!.news!.length : 0
  const live = snapshot.isLive !== false && typeof snapshot.price === "number"
  const warningCount = payload.context?.warnings?.length ?? 0

  // 12 transparent availability checks. Missing news lowers quality,
  // but price/history can still produce an outlook instead of "Data insufficient".
  const checks = [
    live,
    typeof snapshot.price === "number",
    typeof snapshot.previousClose === "number",
    typeof snapshot.changePercent === "number",
    typeof report.confidence === "number",
    Array.isArray(report.whyToday) && report.whyToday.length > 0,
    Array.isArray(report.whyNotToday),
    families.size >= 1,
    families.size >= 2,
    newsCount >= 1,
    newsCount >= 3,
    warningCount === 0,
  ]
  const availableSignals = checks.filter(Boolean).length
  const dataQuality = clamp((availableSignals / checks.length) * 100)

  const score = clamp(report.overallScore)
  const confidence = clamp(
    (report.confidence ?? 55) * 0.7 + dataQuality * 0.3,
  )
  const dayMove = snapshot.changePercent ?? input.dayChangePct ?? 0
  const volatilityPenalty = Math.min(30, Math.abs(dayMove) * 4)

  const todayScore = clamp(score + dayMove * 2)
  const shortScore = clamp(score * 0.88 + confidence * 0.12)
  const mediumScore = clamp(score * 0.76 + confidence * 0.24)

  return {
    ticker: input.ticker,
    score,
    confidence,
    recommendation: report.recommendation ?? "Hold",
    todayBias: bias(todayScore),
    shortOutlook: bias(shortScore),
    mediumOutlook: bias(mediumScore),
    risk: riskFrom(score, volatilityPenalty),
    dataQuality,
    availableSignals,
    totalSignals: checks.length,
    price: snapshot.price ?? 0,
    changePercent: dayMove,
    weight: input.weight ?? 0,
    reasons: (report.whyToday ?? []).slice(0, 3),
    warnings: [
      ...(payload.context?.warnings ?? []),
      ...(report.whyNotToday ?? []).slice(0, 2),
    ].slice(0, 3),
  }
}

export function buildDailyBrief(args: {
  marketItems: BriefMarketItem[]
  holdings: BriefHolding[]
  opportunities: BriefOpportunity[]
  inputHoldings: DailyBriefHoldingInput[]
  sourceFamilies: string[]
  warnings: string[]
}): DailyBriefResponse {
  const { marketItems, holdings, opportunities, inputHoldings, sourceFamilies, warnings } = args

  const sp = marketItems.find((item) => item.symbol === "^GSPC")
  const nasdaq = marketItems.find((item) => item.symbol === "^IXIC")
  const vix = marketItems.find((item) => item.symbol === "^VIX")
  const marketPulse = ((sp?.changePercent ?? 0) + (nasdaq?.changePercent ?? 0)) / 2
  const regime =
    marketPulse > 0.35 && (vix?.price ?? 20) < 22
      ? "Risk-on"
      : marketPulse < -0.35 || (vix?.price ?? 20) > 28
        ? "Risk-off"
        : "Balanced"

  const totalValue = inputHoldings.reduce((sum, item) => sum + (item.marketValue ?? 0), 0)
  const dailyChangeValue = inputHoldings.reduce((sum, item) => sum + (item.dayChangeValue ?? 0), 0)
  const dailyChangePct = totalValue > 0 ? (dailyChangeValue / (totalValue - dailyChangeValue || totalValue)) * 100 : 0

  const weightedScore = holdings.length
    ? holdings.reduce((sum, item) => sum + item.score * Math.max(item.weight, 1), 0) /
      holdings.reduce((sum, item) => sum + Math.max(item.weight, 1), 0)
    : 50

  const largestWeight = Math.max(0, ...holdings.map((item) => item.weight))
  const diversification = clamp(100 - Math.max(0, largestWeight - 15) * 2.4)
  const riskScore = clamp(
    holdings.length
      ? holdings.reduce((sum, item) => sum + (item.risk === "High" ? 80 : item.risk === "Medium" ? 50 : 22), 0) / holdings.length
      : 50,
  )
  const marketAlignment = clamp(weightedScore * 0.7 + (marketPulse + 2) * 12)
  const healthScore = clamp(weightedScore * 0.55 + marketAlignment * 0.2 + diversification * 0.15 + (100 - riskScore) * 0.1)

  const risks: string[] = []
  const highRisk = holdings.filter((item) => item.risk === "High")
  if (highRisk.length) risks.push(`High short-term risk: ${highRisk.map((item) => item.ticker).join(", ")}.`)
  if (largestWeight > 25) risks.push(`Concentration warning: the largest position is ${largestWeight.toFixed(1)}% of the portfolio.`)
  const weak = holdings.filter((item) => item.shortOutlook === "Bearish")
  if (weak.length) risks.push(`Bearish 1–3 day bias: ${weak.map((item) => item.ticker).join(", ")}.`)
  if (!risks.length) risks.push("No critical portfolio risk gate is currently triggered.")

  const actions = holdings
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => {
      if (item.shortOutlook === "Bullish" && item.score >= 78) return `Hold/add watch: ${item.ticker}; strong score, but use staged entries.`
      if (item.shortOutlook === "Bearish") return `Review ${item.ticker}; avoid adding until momentum stabilises.`
      return `Hold ${item.ticker}; no strong 1–3 day edge.`
    })
  if (opportunities[0]) actions.push(`Top ETF watch: ${opportunities[0].ticker} (${opportunities[0].score}/100).`)

  return {
    generatedAt: new Date().toISOString(),
    asOfDate: new Date().toISOString().slice(0, 10),
    status: warnings.length ? "partial" : "live",
    market: {
      items: marketItems,
      regime,
      summary: `Nasdaq ${nasdaq ? `${nasdaq.changePercent >= 0 ? "+" : ""}${nasdaq.changePercent.toFixed(2)}%` : "unavailable"}; S&P 500 ${sp ? `${sp.changePercent >= 0 ? "+" : ""}${sp.changePercent.toFixed(2)}%` : "unavailable"}. Market regime is ${regime.toLowerCase()}.`,
    },
    portfolio: {
      healthScore,
      marketAlignment,
      diversification,
      riskScore,
      dailyChangeValue,
      dailyChangePct,
      holdings,
    },
    opportunities,
    risks,
    actions,
    sourceSummary: {
      sourceFamilies: Array.from(new Set(sourceFamilies)).sort(),
      liveHoldings: holdings.length,
      totalHoldings: inputHoldings.length,
    },
    warnings,
  }
}
