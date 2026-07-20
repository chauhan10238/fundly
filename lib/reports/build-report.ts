import type {
  AnalysisReport,
  ExternalAnalysisContext,
  MarketSnapshot,
} from "@/lib/dios/types"
import type { InstitutionalCompanyIntelligence } from "@/lib/data-providers"
import type { DiosShareableReport, ReportMetric } from "./types"

function money(value?: number, currency = "USD") {
  if (value === undefined || !Number.isFinite(value)) return "Not available"
  const abs = Math.abs(value)
  const suffix =
    abs >= 1e12 ? "T" :
    abs >= 1e9 ? "B" :
    abs >= 1e6 ? "M" : ""
  const divisor =
    abs >= 1e12 ? 1e12 :
    abs >= 1e9 ? 1e9 :
    abs >= 1e6 ? 1e6 : 1
  return `${currency} ${value < 0 ? "-" : ""}${Math.abs(value / divisor).toFixed(abs >= 1e6 ? 2 : 2)}${suffix}`
}

function percent(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return "Not available"
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

function ratio(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return "Not available"
  return value.toFixed(2)
}

function metric(label: string, value: string, note?: string): ReportMetric {
  return { label, value, note }
}

export function buildShareableReport(input: {
  report: AnalysisReport
  intelligence: InstitutionalCompanyIntelligence | null
  snapshot: MarketSnapshot | null
  context: ExternalAnalysisContext | null
}): DiosShareableReport {
  const { report, intelligence, snapshot, context } = input
  const f = intelligence?.fundamentals
  const earnings = intelligence?.earnings

  const financialMetrics: ReportMetric[] = [
    metric("Revenue TTM", money(f?.revenueTTM, f?.currency)),
    metric("Revenue growth", percent(f?.revenueGrowth?.changePercent)),
    metric("Net income TTM", money(f?.netIncomeTTM, f?.currency)),
    metric("Profit margin", percent(f?.profitMargin)),
    metric("Operating cash flow TTM", money(f?.operatingCashFlowTTM, f?.currency)),
    metric("Free cash flow TTM", money(f?.freeCashFlowTTM, f?.currency)),
    metric("Free cash flow margin", percent(f?.freeCashFlowMargin)),
    metric("Cash", money(f?.cash, f?.currency)),
    metric("Total debt", money(f?.totalDebt, f?.currency)),
    metric("Assets", money(f?.assets, f?.currency)),
    metric("Equity", money(f?.equity, f?.currency)),
    metric("Return on equity", percent(f?.returnOnEquity)),
    metric("Debt / equity", ratio(f?.debtToEquity)),
    metric("Current ratio", ratio(f?.currentRatio)),
    metric("Diluted EPS TTM", f?.epsDilutedTTM?.toFixed(2) ?? "Not available"),
  ]

  const earningsMetrics: ReportMetric[] = [
    metric("Next earnings date", earnings?.nextDate ?? "Not available"),
    metric("Days until earnings", earnings?.daysUntil?.toString() ?? "Not available"),
    metric("EPS estimate", earnings?.epsEstimate?.toFixed(2) ?? "Not available"),
    metric("Revenue estimate", money(earnings?.revenueEstimate)),
    metric("Latest EPS surprise", percent(earnings?.latestEpsSurprisePercent)),
    metric("Latest revenue surprise", percent(earnings?.latestRevenueSurprisePercent)),
  ]

  return {
    version: "3.3",
    generatedAt: new Date().toISOString(),
    ticker: report.ticker,
    companyName:
      intelligence?.entityName ??
      context?.fundamentals?.companyName ??
      report.ticker,
    price: snapshot?.price ?? report.price,
    currency:
      context?.instrument?.currency ??
      intelligence?.fundamentals?.currency ??
      "USD",
    recommendation: report.recommendation,
    confidence: report.confidence,
    overallScore: report.overallScore,
    suggestedWeight: report.proposedWeight,
    executiveSummary:
      intelligence?.summary?.length
        ? intelligence.summary
        : report.whyToday.slice(0, 5),
    investmentReasons: report.whyToday.slice(0, 8),
    risks: report.thesisInvalidation.slice(0, 8),
    sourceConfidence: {
      score: intelligence?.providerConfidence.score ?? report.confidence,
      connected: intelligence?.providerConfidence.connected ?? [],
      unavailable: intelligence?.providerConfidence.unavailable ?? [],
    },
    financialHealth: intelligence?.financialHealth
      ? {
          score: intelligence.financialHealth.score,
          label: intelligence.financialHealth.label,
          pillars: intelligence.financialHealth.pillars.map((pillar) => ({
            name: pillar.name,
            score: pillar.score,
            explanation: pillar.explanation,
          })),
          strengths: intelligence.financialHealth.strengths,
          risks: intelligence.financialHealth.risks,
        }
      : undefined,
    financialMetrics,
    earnings: earningsMetrics,
    news: {
      sentiment: intelligence?.news.sentiment ?? "neutral",
      sentimentScore: intelligence?.news.sentimentScore ?? 50,
      confidence: intelligence?.news.confidence ?? 0,
      themes: intelligence?.news.themes ?? [],
      headlines: intelligence?.news.keyHeadlines.slice(0, 8) ?? [],
    },
    filings: intelligence?.filings.slice(0, 8) ?? [],
    scenarios: Array.isArray(report.scenarios)
      ? report.scenarios.slice(0, 5).map((scenario: any) => ({
          name: scenario.name ?? scenario.label ?? "Scenario",
          probability: scenario.probability,
          target: scenario.target,
          returnPct: scenario.returnPct ?? scenario.return,
          description: scenario.description,
        }))
      : [],
    sources:
      context?.sources?.slice(0, 15).map((source) => ({
        name: source.name,
        date: source.date,
        url: source.url,
      })) ?? [],
    disclaimer:
      "This report is generated for educational and informational purposes only. It is not personal financial advice, a recommendation to transact, or a substitute for professional advice. Market data may be delayed or incomplete.",
  }
}
