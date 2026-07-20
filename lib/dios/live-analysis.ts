import { analyse } from "./analyse"
import type { PortfolioSummary } from "./portfolio-engine"
import type {
  AnalysisReport,
  ExternalAnalysisContext,
  MarketSnapshot,
  Settings,
} from "./types"

export interface LiveAnalysisResult {
  report: AnalysisReport
  snapshot: MarketSnapshot | null
  context: ExternalAnalysisContext | null
  warning: string | null
  source: "live" | "fallback"
}

function asReport(
  ticker: string,
  portfolio: PortfolioSummary,
  settings: Settings,
  snapshot?: MarketSnapshot,
  context?: ExternalAnalysisContext,
): AnalysisReport {
  const result = analyse(ticker, portfolio, settings, snapshot, context)

  if ("error" in result) {
    throw new Error(result.error)
  }

  return result
}

/**
 * The single client-side entry point for a DIOS decision.
 *
 * Analyse, Portfolio and future Daily Briefing pages should all call this
 * function so recommendation, score and confidence cannot diverge.
 */
export async function fetchLiveAnalysisReport(
  tickerInput: string,
  portfolio: PortfolioSummary,
  settings: Settings,
): Promise<LiveAnalysisResult> {
  const ticker = tickerInput.trim().toUpperCase()

  if (!ticker) {
    throw new Error("Ticker is required")
  }

  try {
    const response = await fetch(
      `/api/analysis?ticker=${encodeURIComponent(ticker)}`,
      { cache: "no-store" },
    )

    const payload = await response.json() as {
      snapshot?: MarketSnapshot
      context?: ExternalAnalysisContext
      error?: string
      warning?: string
    }

    if (!response.ok || !payload.snapshot) {
      throw new Error(
        payload.error || `Analysis request failed (${response.status})`,
      )
    }

    const context = payload.context ?? null
    const report = asReport(
      ticker,
      portfolio,
      settings,
      payload.snapshot,
      context ?? undefined,
    )

    const warning =
      payload.warning ??
      (context?.warnings?.length ? context.warnings.join(" ") : null)

    return {
      report,
      snapshot: payload.snapshot,
      context,
      warning,
      source: "live",
    }
  } catch (error) {
    // A network/provider problem must not leave a held ETF or stock without a
    // decision. Use the same DIOS engine with its tracked fallback data.
    const report = asReport(ticker, portfolio, settings)

    return {
      report,
      snapshot: null,
      context: null,
      warning:
        error instanceof Error
          ? `Live context unavailable. ${error.message}`
          : "Live context unavailable.",
      source: "fallback",
    }
  }
}
