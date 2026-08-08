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

// Cache successful raw provider payloads. The DIOS report itself is still
// recalculated against the current portfolio/settings every time.
const API_CACHE_TTL_MS = 5 * 60_000
const API_TIMEOUT_MS = 10_000

const payloadCache = new Map<string, { expiresAt: number; payload: AnalysisPayload }>()

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

async function fetchAnalysisPayload(
  ticker: string,
  externalSignal?: AbortSignal,
): Promise<AnalysisPayload> {
  const now = Date.now()
  const cached = payloadCache.get(ticker)
  if (cached && cached.expiresAt > now) {
    return cached.payload
  }

  if (externalSignal?.aborted) {
    throw new DOMException("Analysis stopped", "AbortError")
  }

  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  const abortFromCaller = () => controller.abort()
  externalSignal?.addEventListener("abort", abortFromCaller, { once: true })

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
    externalSignal?.removeEventListener("abort", abortFromCaller)
  }
}

/**
 * The single client-side entry point for a DIOS decision.
 *
 * The optional AbortSignal is used by Daily Brief / Daily Scan so the user can
 * stop a run immediately and prevent the remaining provider calls from being
 * started. Existing callers that do not pass a signal continue to work.
 */
export async function fetchLiveAnalysisReport(
  tickerInput: string,
  portfolio: PortfolioSummary,
  settings: Settings,
  signal?: AbortSignal,
): Promise<LiveAnalysisResult> {
  const ticker = tickerInput.trim().toUpperCase()

  if (!ticker) {
    throw new Error("Ticker is required")
  }

  try {
    const payload = await fetchAnalysisPayload(ticker, signal)
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
    // A deliberate user stop is different from provider failure. Propagate it
    // so the concurrency worker stops scheduling more tickers instead of
    // generating fallback reports and continuing to consume calls.
    if (signal?.aborted) {
      throw new DOMException("Analysis stopped", "AbortError")
    }

    // A provider timeout/error still returns a fallback DIOS decision.
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
