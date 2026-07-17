import { getInstrument, UNIVERSE_LIST, MODEL_VERSION, SCORING_VERSION } from "./universe"
import { GEO, MACRO } from "./macro"
import {
  computeScores,
  confidenceScore,
  recommend,
  riskAdjusted,
  suggestedMaxWeight,
  weightedScore,
} from "./scoring"
import { buildScenarios } from "./scenarios"
import type { PortfolioSummary } from "./portfolio-engine"
import type {
  Alternative,
  AnalysisReport,
  Instrument,
  PortfolioImpact,
  ScoreSet,
  Settings,
  SourceCitation,
  MarketSnapshot,
  ExternalAnalysisContext,
  LiveNewsItem,
} from "./types"
import { changePct, fmtPct } from "../format"


// Curated alternative sets; fallback to sector peers.
const ALT_MAP: Record<string, string[]> = {
  INTC: ["SMH", "SOXX", "TSM", "AMD", "VOO"],
  SMH: ["SOXX", "SOXQ", "NVDA", "VOO", "GLD"],
  SOXX: ["SMH", "SOXQ", "XLK", "VOO"],
  AMD: ["NVDA", "SMH", "AVGO", "SOXX"],
  NVDA: ["SMH", "AVGO", "SOXX", "TSM"],
  TSM: ["SMH", "ASML", "AVGO", "SOXX"],
  VOO: ["VTI", "VT", "QQQ", "SCHD"],
  VT: ["VTI", "VOO", "SCHD"],
  GLD: ["GDX", "SLV", "TLT", "SCHD"],
  QQQ: ["XLK", "VOO", "SMH", "VTI"],
}

function findAlternatives(inst: Instrument): string[] {
  if (ALT_MAP[inst.ticker]) return ALT_MAP[inst.ticker]
  const peers = UNIVERSE_LIST.filter(
    (i) => i.ticker !== inst.ticker && i.sector === inst.sector && !i.leveraged,
  )
    .sort((a, b) => b.qualityHint - a.qualityHint)
    .slice(0, 3)
    .map((i) => i.ticker)
  return [...peers, "VOO"].slice(0, 4)
}

function riskLabel(band: string) {
  return band.charAt(0).toUpperCase() + band.slice(1)
}

function buildPortfolioImpact(
  inst: Instrument,
  portfolio: PortfolioSummary,
  currentWeight: number,
  proposedWeight: number,
): PortfolioImpact {
  const ownsAnalysed = portfolio.positions.some((p) => p.ticker === inst.ticker)
  const sectorBefore = portfolio.exposure.sector.find((s) => s.label === inst.sector)?.pct ?? 0

  // direct overlap: held stocks that are also underlying names of the analysed ETF,
  // or (if analysing a stock) ETFs held that contain this stock.
  const directOverlap: string[] = []
  const lookThroughOverlap: string[] = []

  if (inst.type === "etf" && inst.holdings) {
    for (const p of portfolio.positions) {
      if (p.instrument.type === "stock" && inst.holdings[p.ticker]) directOverlap.push(p.ticker)
    }
  } else if (inst.type === "stock") {
    for (const p of portfolio.positions) {
      if (p.instrument.type === "etf" && p.instrument.holdings?.[inst.ticker]) lookThroughOverlap.push(p.ticker)
      if (p.instrument.type === "stock" && p.instrument.sector === inst.sector) directOverlap.push(p.ticker)
    }
  }

  const countryOverlap = portfolio.positions
    .filter((p) => p.instrument.country === inst.country && p.ticker !== inst.ticker)
    .map((p) => p.ticker)

  // crude correlation proxy from shared sector/theme
  let correlation = 0.2
  if (sectorBefore > 0) correlation += 0.3
  if (inst.themes?.includes("semiconductors") && portfolio.exposure.semiconductor > 15) correlation += 0.3
  correlation = Math.min(0.92, Math.round(correlation * 100) / 100)

  const sectorAfter = sectorBefore + (proposedWeight - currentWeight)

  let diversificationBenefit = "Moderate"
  if (inst.sector === "Diversified" || inst.tags.includes("core")) diversificationBenefit = "High — broadens the portfolio"
  else if (directOverlap.length >= 2 || lookThroughOverlap.length >= 1) diversificationBenefit = "Low — concentrates existing exposure"

  let concentrationNote: string
  if (!ownsAnalysed) {
    concentrationNote = `You do not currently own ${inst.ticker}.`
    if (directOverlap.length || lookThroughOverlap.length) {
      const dup = [...directOverlap, ...lookThroughOverlap].join(", ")
      concentrationNote += ` However, purchasing ${inst.ticker} would increase ${inst.sector.toLowerCase()} exposure and duplicate exposure to ${dup}.`
    }
  } else {
    const held = portfolio.positions.find((p) => p.ticker === inst.ticker)!
    concentrationNote = `You already own ${inst.ticker} at ${held.weight.toFixed(1)}% of the portfolio. This analysis evaluates adding to or trimming the position.`
  }

  return {
    currentWeight,
    proposedWeight,
    sectorExposureBefore: sectorBefore,
    sectorExposureAfter: sectorAfter,
    directOverlap,
    lookThroughOverlap,
    countryOverlap,
    correlation,
    diversificationBenefit,
    concentrationNote,
    ownsAnalysed,
  }
}

function buildAlternatives(inst: Instrument, portfolio: PortfolioSummary, settings: Settings): Alternative[] {
  return findAlternatives(inst)
    .map((t) => getInstrument(t))
    .filter((i): i is Instrument => Boolean(i))
    .map((alt) => {
      const held = portfolio.positions.find((p) => p.ticker === alt.ticker)
      const currentWeight = held?.weight ?? 0
      const scores = computeScores({ instrument: alt, portfolio, currentWeight, settings })
      const overall = weightedScore(scores, settings)
      const sc = buildScenarios(alt, scores, overall)
      const isDiversifier = alt.sector === "Diversified" || alt.tags.includes("core")
      return {
        ticker: alt.ticker,
        name: alt.name,
        score: overall,
        risk: alt.riskBand,
        valuation: alt.valuationHint > 58 ? "Attractive" : alt.valuationHint > 45 ? "Fair" : "Full",
        diversification: isDiversifier ? "Improves diversification" : "Similar exposure",
        portfolioFit: scores.portfolioFit >= 60 ? "Good fit" : scores.portfolioFit >= 45 ? "Overlaps" : "Concentrates",
        expectedReturn: `${fmtPct(sc.base.low * 100, 0)} to ${fmtPct(sc.base.high * 100, 0)} p.a. (base)`,
        rationale: isDiversifier
          ? `Broader exposure than ${inst.ticker} with lower single-name risk.`
          : `Comparable ${alt.sector.toLowerCase()} exposure; compare valuation and quality versus ${inst.ticker}.`,
      }
    })
    .sort((a, b) => b.score - a.score)
}

function fallbackSources(inst: Instrument, retrieved: string): SourceCitation[] {
  return [
    { id: "S1", name: "DIOS tracked instrument model — fallback data", date: retrieved.slice(0, 10), url: "", retrieved },
    { id: "S2", name: `${inst.name} — tracked universe metadata`, date: retrieved.slice(0, 10), url: "", retrieved },
  ]
}

function sourceRef(item: LiveNewsItem, context: ExternalAnalysisContext): string {
  const index = context.sources.findIndex((source) => source.url && source.url === item.url)
  return index >= 0 ? `[${context.sources[index].id}, ${item.publishedAt.slice(0, 10)}]` : `[${item.publishedAt.slice(0, 10)}]`
}

function recentNewsReasons(context?: ExternalAnalysisContext): string[] {
  if (!context?.news.length) return []
  return context.news.slice(0, 3).map((item) => `${item.title} — ${item.source} ${sourceRef(item, context)}.`)
}

function newsRisk(context?: ExternalAnalysisContext): string | null {
  const negative = context?.news.find((item) => item.sentiment === "negative")
  return negative ? `${negative.title} — ${negative.source} ${sourceRef(negative, context!)}.` : null
}


export function analyse(
  ticker: string,
  portfolio: PortfolioSummary,
  settings: Settings,
  market?: MarketSnapshot,
  external?: ExternalAnalysisContext,
): AnalysisReport | { error: string } {
  const inst = getInstrument(ticker)
  if (!inst) return { error: `Ticker "${ticker}" is not in the current demo universe. Add it to the universe or configure a market-data provider.` }

  const dataComplete = Boolean(market?.isLive && external && external.sources.length > 0)
  const held = portfolio.positions.find((p) => p.ticker === inst.ticker)
  const currentWeight = held?.weight ?? 0

  const scores: ScoreSet = computeScores({ instrument: inst, portfolio, currentWeight, settings })
  const overallScore = weightedScore(scores, settings)
  const recommendation = recommend(overallScore, scores, inst, currentWeight, settings)
  const confidence = confidenceScore(scores, dataComplete)
  const maxWeight = suggestedMaxWeight(inst, overallScore, settings)
  const proposedWeight = Math.min(maxWeight, held ? held.weight : maxWeight * 0.6)
  const scenarios = buildScenarios(inst, scores, overallScore)
  const portfolioImpact = buildPortfolioImpact(inst, portfolio, currentWeight, proposedWeight)
  const alternatives = buildAlternatives(inst, portfolio, settings)
  const price = market?.price ?? inst.price
  const previousClose = market?.previousClose ?? inst.prevClose
  const dailyChange = market?.changePercent ?? changePct(price, previousClose)

  const report: AnalysisReport = {
    ticker: inst.ticker,
    name: inst.name,
    instrumentType: inst.type,
    price,
    dailyChange,
    overallScore,
    recommendation,
    confidence,
    suggestedMaxWeight: maxWeight,
    currentWeight,
    proposedWeight,
    horizon: settings.defaultHorizon,
    lastUpdated: market?.refreshedAt ?? new Date().toISOString(),
    modelVersion: MODEL_VERSION,
    scoringVersion: SCORING_VERSION,
    scores,
    whyToday: buildWhyToday({ ...inst, price }, scores, external),
    whyNotToday: buildWhyNotToday({ ...inst, price }, scores, portfolioImpact, external),
    whyNotWait: buildWhyNotWait({ ...inst, price }, scores, external),
    recentChanges: buildRecentChanges({ ...inst, price }, external),
    betterEntryConditions: buildBetterEntry({ ...inst, price }, scores),
    thesisInvalidation: buildInvalidation({ ...inst, price }),
    alternatives,
    scenarios,
    portfolioImpact,
    sources: external?.sources.length ? external.sources : fallbackSources(inst, market?.refreshedAt ?? new Date().toISOString()),
    dataComplete,
    strongestReasons: buildWhyToday({ ...inst, price }, scores, external).slice(0, 3),
    mainRisk: newsRisk(external) ?? buildInvalidation({ ...inst, price })[0] ?? "The investment thesis may weaken if fundamentals or portfolio fit deteriorate.",
    decisionChangeCondition: buildBetterEntry({ ...inst, price }, scores)[0] ?? "A material change in valuation, fundamentals or portfolio concentration would change the decision.",
    concentrationWarnings: buildConcentrationWarnings(inst, portfolio, currentWeight, settings),
    marketDataProvider: market?.provider ?? "DIOS model fallback",
    isLivePrice: Boolean(market?.isLive),
  }
  return report
}

function buildConcentrationWarnings(
  inst: Instrument,
  portfolio: PortfolioSummary,
  currentWeight: number,
  settings: Settings,
): string[] {
  const warnings: string[] = []
  const sectorWeight = portfolio.exposure.sector.find((item) => item.label === inst.sector)?.pct ?? 0
  if (inst.type === "stock" && currentWeight > 10) {
    warnings.push(`${inst.ticker} is ${currentWeight.toFixed(1)}% of the portfolio, above the 10% single-stock rule.`)
  }
  if (sectorWeight > 35) {
    warnings.push(`${inst.sector} exposure is ${sectorWeight.toFixed(1)}%, above the 35% sector rule.`)
  }
  if (inst.leveraged && currentWeight > 3) {
    warnings.push(`${inst.ticker} is leveraged and exceeds the 3% maximum exposure rule.`)
  }
  if (inst.themes?.includes("semiconductors") && portfolio.exposure.semiconductor > 35) {
    warnings.push(`Semiconductor exposure is ${portfolio.exposure.semiconductor.toFixed(1)}%, above the 35% concentration rule.`)
  }
  if (warnings.length === 0 && currentWeight > settings.maxStockWeight && inst.type === "stock") {
    warnings.push(`${inst.ticker} exceeds your configured ${settings.maxStockWeight}% stock limit.`)
  }
  return warnings
}

function buildWhyToday(inst: Instrument, s: ScoreSet, context?: ExternalAnalysisContext): string[] {
  const out: string[] = []
  const positiveNews = context?.news.filter((item) => item.sentiment === "positive").slice(0, 2) ?? []
  for (const item of positiveNews) out.push(`${item.title} — ${item.source} ${sourceRef(item, context!)}.`)
  if (context?.earnings?.isUpcoming) out.push(`Upcoming earnings on ${context.earnings.date}; event risk supports staged sizing rather than a full entry.`)
  if (s.technical >= 65) out.push(`Price trend is constructive with momentum score ${s.technical}/100; the name trades above key moving averages based on the current price trend.`)
  if (s.macro >= 60) out.push(`Macro regime ("${MACRO.regime}") is supportive at ${s.macro}/100 for this profile — disinflation plus an easing bias using the current DIOS macro regime.`)
  if (s.quality >= 80) out.push(`Business quality is high (${s.quality}/100): durable margins and competitive position support a core allocation.`)
  if (inst.themes?.includes("ai")) out.push(`Structural AI-driven demand remains a multi-quarter tailwind; confirm this against the latest earnings source listed below.`)
  if (out.length === 0) out.push(`Valuation is the primary attraction today at ${s.valuation}/100; entry is reasonable rather than momentum-driven.`)
  return out
}

function buildWhyNotToday(inst: Instrument, s: ScoreSet, impact: PortfolioImpact, context?: ExternalAnalysisContext): string[] {
  const out: string[] = []
  const negativeNews = context?.news.filter((item) => item.sentiment === "negative").slice(0, 2) ?? []
  for (const item of negativeNews) out.push(`${item.title} — ${item.source} ${sourceRef(item, context!)}.`)
  if (s.geopolitics < 50) out.push(`Geopolitical risk is elevated (${s.geopolitics}/100) given ${inst.country === "Taiwan" ? "Taiwan Strait supply concentration" : "sector-specific export-control exposure"}; monitor the latest geopolitical sources below.`)
  if (s.valuation < 45) out.push(`Valuation is full at ${s.valuation}/100, leaving limited margin of safety if guidance disappoints.`)
  if (impact.directOverlap.length || impact.lookThroughOverlap.length) out.push(`Adds to existing overlap with ${[...impact.directOverlap, ...impact.lookThroughOverlap].join(", ")}, raising concentration.`)
  if (s.psychology < 50) out.push(`Behavioural risk of chasing strength is high (${s.psychology}/100); avoid adding on an extended move.`)
  if (out.length === 0) out.push(`No major red flags today, but size the entry to respect portfolio limits.`)
  return out
}

function buildWhyNotWait(inst: Instrument, s: ScoreSet, context?: ExternalAnalysisContext): string[] {
  const out: string[] = []
  const positiveNews = context?.news.filter((item) => item.sentiment === "positive").slice(0, 2) ?? []
  for (const item of positiveNews) out.push(`${item.title} — ${item.source} ${sourceRef(item, context!)}.`)
  if (context?.earnings?.isUpcoming) out.push(`Upcoming earnings on ${context.earnings.date}; event risk supports staged sizing rather than a full entry.`)
  if (s.technical >= 65) out.push(`Waiting risks missing continuation while the trend and flows (${s.flows}/100) remain positive.`)
  if (context?.earnings?.isUpcoming) out.push(`Earnings are scheduled for ${context.earnings.date}; a positive surprise could re-rate the name before a cheaper entry appears.`)
  else if (inst.nextEvent) out.push(`A catalyst (${inst.nextEvent}) on ${inst.nextEventDate} could re-rate the name before a cheaper entry appears.`)
  out.push(`Dollar-cost averaging a partial position now preserves optionality versus waiting for a perfect entry that may not arrive.`)
  return out
}

function buildRecentChanges(inst: Instrument, context?: ExternalAnalysisContext): string[] {
  const live = recentNewsReasons(context)
  if (live.length) {
    if (context?.earnings) live.push(`${context.earnings.isUpcoming ? "Upcoming" : "Most recent"} earnings date: ${context.earnings.date}.`)
    return live
  }
  const out: string[] = []
  if (inst.themes?.includes("semiconductors")) out.push(`Latest quarter showed re-accelerating data-center revenue and raised full-year guidance.`)
  if (inst.themes?.includes("gold")) out.push(`Real yields fell ~30bps over the past month and central-bank buying continued using the current DIOS macro regime.`)
  out.push(`Consensus estimates were revised ${inst.growthHint > 70 ? "higher" : "modestly"} over the last 30 days.`)
  out.push(`Macro regime shifted toward an easing bias since the January FOMC.`)
  return out
}

function buildBetterEntry(inst: Instrument, s: ScoreSet): string[] {
  const out: string[] = []
  const pullback = inst.price * (s.valuation < 45 ? 0.9 : 0.95)
  out.push(`A pullback toward $${pullback.toFixed(2)} (${s.valuation < 45 ? "~10%" : "~5%"}) would improve the risk/reward.`)
  if (inst.nextEvent) out.push(`Waiting for ${inst.nextEvent} on ${inst.nextEventDate} would remove event uncertainty before committing full size.`)
  out.push(`Confirmation of margin stability or guidance in the next report would raise conviction for a larger position.`)
  return out
}

function buildInvalidation(inst: Instrument): string[] {
  const out: string[] = []
  if (inst.themes?.includes("semiconductors")) out.push("A demand air-pocket or inventory correction that cuts forward revenue guidance would invalidate the thesis.")
  if (inst.country === "Taiwan") out.push("A material escalation in Taiwan Strait tensions disrupting foundry supply.")
  out.push(`A close below key support (roughly $${(inst.price * 0.82).toFixed(2)}, ~18% downside) would signal thesis failure and trigger the exit rule.`)
  out.push("Two consecutive quarters of margin compression without a clear one-off explanation.")
  return out
}
