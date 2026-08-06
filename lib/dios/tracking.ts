import type {
  ExistingHoldingBaseline,
  RecommendationHorizon,
  RecommendationRecord,
  TrackingMetadata,
} from "./types"

export const SUREN_TRACKING_START_DATE = "2026-08-05"
export const SUREN_TRACKING_START_AT = "2026-08-04T14:00:00.000Z"
export const SUREN_TRACKING_TIMEZONE = "Australia/Sydney"
export const HOLDING_BASELINE_VERSION = 1
export const TRACKING_BENCHMARK = "SPY"

export const PERFORMANCE_HORIZONS: Array<{
  key: RecommendationHorizon
  label: string
  days: number
}> = [
  { key: "d1", label: "1 Day", days: 1 },
  { key: "w1", label: "1 Week", days: 7 },
  { key: "m1", label: "1 Month", days: 30 },
  { key: "m3", label: "3 Months", days: 90 },
  { key: "m6", label: "6 Months", days: 180 },
  { key: "m12", label: "12 Months", days: 365 },
]

export function emptyPerformanceOutcomes(): Record<RecommendationHorizon, number | null> {
  return { d1: null, w1: null, m1: null, m3: null, m6: null, m12: null }
}

export function defaultSurenTracking(): TrackingMetadata {
  return {
    profileId: "suren",
    timezone: SUREN_TRACKING_TIMEZONE,
    startDate: SUREN_TRACKING_START_DATE,
    startAt: SUREN_TRACKING_START_AT,
    benchmark: TRACKING_BENCHMARK,
    baselineVersion: HOLDING_BASELINE_VERSION,
    baselineStatus: "pending",
  }
}

export function recommendationIsEligible(
  profileId: string | null | undefined,
  record: RecommendationRecord,
) {
  if (profileId !== "suren") return true
  if (record.origin === "seed") return false
  const timestamp = new Date(record.datetime).getTime()
  return Number.isFinite(timestamp) && timestamp >= new Date(SUREN_TRACKING_START_AT).getTime()
}

export function trackedRecommendationsForProfile(
  profileId: string | null | undefined,
  recommendations: RecommendationRecord[],
) {
  return recommendations.filter((record) => recommendationIsEligible(profileId, record))
}

export function baselineNeedsMeasurement(baseline: ExistingHoldingBaseline, now = Date.now()) {
  const start = new Date(baseline.startAt).getTime()
  if (!Number.isFinite(start)) return false
  return PERFORMANCE_HORIZONS.some(
    ({ key, days }) => now >= start + days * 86_400_000 && baseline.outcomes[key] === null,
  )
}
