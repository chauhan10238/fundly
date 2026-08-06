import type {
  ExistingHoldingBaseline,
  RecommendationHorizon,
  RecommendationRecord,
  TrackingMetadata,
} from "./types"

export const DEFAULT_TRACKING_START_DATE = "2026-08-05"
export const DEFAULT_TRACKING_TIMEZONE = "Australia/Sydney"
export const HOLDING_BASELINE_VERSION = 2
export const TRACKING_BENCHMARK = "SPY"

// Existing profiles start from the clean Fundly launch baseline. Any profile added
// later receives its own first-use date and that date is persisted in TrackingMetadata.
const PROFILE_TRACKING_START_DATES: Record<string, string> = {
  deepak: DEFAULT_TRACKING_START_DATE,
  suren: DEFAULT_TRACKING_START_DATE,
}

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

function sydneyDateToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TRACKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function trackingStartDateForProfile(profileId: string, persistedStartDate?: string | null) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(persistedStartDate ?? ""))) {
    return String(persistedStartDate)
  }
  return PROFILE_TRACKING_START_DATES[profileId] ?? sydneyDateToday()
}

export function trackingStartAtForDate(date: string) {
  // Sydney was UTC+10 on 5 Aug 2026. This fixed midnight representation is also
  // suitable for new profiles because eligibility is day-based rather than intraday.
  const [year, month, day] = date.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day) - 10 * 60 * 60 * 1000).toISOString()
}

export function defaultTrackingForProfile(
  profileId: string,
  persistedStartDate?: string | null,
): TrackingMetadata {
  const startDate = trackingStartDateForProfile(profileId, persistedStartDate)
  return {
    profileId,
    timezone: DEFAULT_TRACKING_TIMEZONE,
    startDate,
    startAt: trackingStartAtForDate(startDate),
    benchmark: TRACKING_BENCHMARK,
    baselineVersion: HOLDING_BASELINE_VERSION,
    baselineStatus: "pending",
  }
}

export function recommendationIsEligible(
  profileId: string | null | undefined,
  record: RecommendationRecord,
  tracking?: TrackingMetadata | null,
) {
  if (!profileId) return false
  if (record.origin === "seed") return false
  const startAt = tracking?.startAt ?? defaultTrackingForProfile(profileId).startAt
  const timestamp = new Date(record.datetime).getTime()
  return Number.isFinite(timestamp) && timestamp >= new Date(startAt).getTime()
}

export function trackedRecommendationsForProfile(
  profileId: string | null | undefined,
  recommendations: RecommendationRecord[],
  tracking?: TrackingMetadata | null,
) {
  return recommendations.filter((record) => recommendationIsEligible(profileId, record, tracking))
}

export function baselineNeedsMeasurement(baseline: ExistingHoldingBaseline, now = Date.now()) {
  const start = new Date(baseline.startAt).getTime()
  if (!Number.isFinite(start)) return false
  return PERFORMANCE_HORIZONS.some(
    ({ key, days }) => now >= start + days * 86_400_000 && baseline.outcomes[key] === null,
  )
}
