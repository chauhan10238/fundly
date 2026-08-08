import { analyse } from "./analyse"
import type { PortfolioSummary } from "./portfolio-engine"
import { calibrateLiveDecision } from "./decision-calibration"
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

type AnalysisPayload = {
  snapshot?: MarketSnapshot
  context?: ExternalAnalysisContext
  error?: string
  warning?: string
}

// The Daily Brief and Daily Scan can ask for the same ticker at the same time.
// Keep a short-lived client cache for raw API data and share in-flight requests.
// We intentionally cache only the raw market payload; the DIOS report is still
// rebuilt against the current portfolio/settings on every call.
const API_CACHE_TTL_MS = 5 * 60_000
const API_TIMEOUT_MS = 10_000

const payloadCache = new Map<string, { expiresAt: number; payload: AnalysisPayload }>()
const inFlight = new Map<string, Promise<AnalysisPayload>>()

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

async function fetchAnalysisPayload(ticker: string): Promise<AnalysisPayload> {
  const now = Date.now()
  const cached = payloadCache.get(ticker)
  if (cached && cached.expiresAt > now) {
    return cached.payload
  }

  const existing = inFlight.get(ticker)
  if (existing) return existing

  const request = (async () => {
    const controller = new AbortController()
    const timeout = globalThis.setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    try {
      const response = await fetch(
        `/api/analysis?ticker=${encodeURIComponent(ticker)}`,
        { cache: "no-store", signal: controller.signal },
      )

      const payload = await response.json() as AnalysisPayload

      if (!response.ok || !payload.snapshot) {
        throw new Error(
          payload.error || `Analysis request failed (${response.status})`,
        )
      }

      payloadCache.set(ticker, {
        expiresAt: Date.now() + API_CACHE_TTL_MS,
        payload,
      })

      return payload
    } finally {
      globalThis.clearTimeout(timeout)
      inFlight.delete(ticker)
    }
  })()

  inFlight.set(ticker, request)
  return request
}

/**
 * The single client-side entry point for a DIOS decision.
 *
 * Analyse, Portfolio, Daily Brief and Daily Scan all call this function so
 * recommendation, score and confidence cannot diverge.
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
    const payload = await fetchAnalysisPayload(ticker)
    const context = payload.context ?? null
    const rawReport = asReport(
      ticker,
      portfolio,
      settings,
      payload.snapshot,
      context ?? undefined,
    )
    const report = calibrateLiveDecision({
      report: rawReport,
      context,
      usedFallback: false,
    })

    const warning =
      payload.warning ??
      (context?.warnings?.length ? context.warnings.join(" ") : null)

    return {
      report,
      snapshot: payload.snapshot ?? null,
      context,
      warning,
      source: "live",
    }
  } catch (error) {
    // A network/provider problem must not leave a held ETF or stock without a
    // decision. Use the same DIOS engine with its tracked fallback data.
    const rawReport = asReport(ticker, portfolio, settings)
    const report = calibrateLiveDecision({
      report: rawReport,
      context: null,
      usedFallback: true,
    })

    const message = error instanceof Error
      ? error.name === "AbortError"
        ? `Live request timed out after ${Math.round(API_TIMEOUT_MS / 1000)} seconds.`
        : error.message
      : "Live context unavailable."

    return {
      report,
      snapshot: null,
      context: null,
      warning: `Live context unavailable. ${message}`,
      source: "fallback",
    }
  }
}
