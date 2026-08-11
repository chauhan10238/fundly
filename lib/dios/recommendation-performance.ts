import type {
  RecommendationExecutionStatus,
  RecommendationHorizon,
  RecommendationRecord,
} from "./types"

export const POSITIVE_CALLS = ["Strong Buy", "Buy", "Start Small", "Buy Watch"]
export const NEGATIVE_CALLS = ["Sell", "Avoid", "Reduce"]
export const FOLLOWED_STATUSES: RecommendationExecutionStatus[] = [
  "Executed",
  "Partially Executed",
  "Already Own",
]

export const HORIZONS: Array<{ key: RecommendationHorizon; label: string; days: number }> = [
  { key: "d1", label: "1 Day", days: 1 },
  { key: "w1", label: "1 Week", days: 7 },
  { key: "m1", label: "1 Month", days: 30 },
  { key: "m3", label: "3 Months", days: 90 },
  { key: "m6", label: "6 Months", days: 180 },
  { key: "m12", label: "12 Months", days: 365 },
]

export function normalizedStatus(status?: RecommendationExecutionStatus): RecommendationExecutionStatus {
  return !status || status === "Pending" ? "Awaiting Decision" : status
}

export function primaryOutcome(record: RecommendationRecord): number | null {
  return record.outcomes.m12 ?? record.outcomes.m6 ?? record.outcomes.m3 ?? record.outcomes.m1 ?? record.outcomes.w1 ?? record.outcomes.d1
}

export function primaryBenchmarkOutcome(record: RecommendationRecord): number | null {
  const b = record.benchmarkOutcomes
  if (!b) return null
  return b.m12 ?? b.m6 ?? b.m3 ?? b.m1 ?? b.w1 ?? b.d1
}

export function isMeasured(record: RecommendationRecord) {
  return primaryOutcome(record) !== null
}

export function directionalValue(record: RecommendationRecord, outcome = primaryOutcome(record)) {
  if (outcome === null) return null
  if (POSITIVE_CALLS.includes(record.recommendation)) return outcome
  if (NEGATIVE_CALLS.includes(record.recommendation)) return -outcome
  return Math.abs(outcome) < 5 ? 5 - Math.abs(outcome) : -Math.abs(outcome)
}

export function callWasCorrect(record: RecommendationRecord) {
  const value = directionalValue(record)
  return value === null ? null : value > 0
}

export function aiAlpha(record: RecommendationRecord) {
  const outcome = primaryOutcome(record)
  const benchmark = primaryBenchmarkOutcome(record)
  if (outcome === null || benchmark === null) return null
  if (POSITIVE_CALLS.includes(record.recommendation)) return outcome - benchmark
  if (NEGATIVE_CALLS.includes(record.recommendation)) return benchmark - outcome
  return Math.abs(benchmark) - Math.abs(outcome)
}

export function trackingNotional(record: RecommendationRecord) {
  if (record.executionQuantity && record.executionPrice) {
    return record.executionQuantity * record.executionPrice
  }
  return record.trackingNotional ?? record.snapshot?.suggestedNotional ?? 10_000
}

export function opportunityDollars(record: RecommendationRecord) {
  const outcome = primaryOutcome(record)
  if (outcome === null) return null
  return trackingNotional(record) * Math.abs(outcome) / 100
}

export function outcomeClassification(record: RecommendationRecord) {
  const status = normalizedStatus(record.executionStatus)
  const outcome = primaryOutcome(record)
  if (outcome === null) return "Tracking"

  if (status === "Ignored") {
    if (POSITIVE_CALLS.includes(record.recommendation)) {
      return outcome > 0 ? "Missed opportunity" : "Loss avoided"
    }
    if (NEGATIVE_CALLS.includes(record.recommendation)) {
      return outcome < 0 ? "Warning ignored" : "Good decision to ignore"
    }
    return "Ignored outcome"
  }

  if (status === "Watching" || status === "Awaiting Decision") {
    return callWasCorrect(record) ? "Call correct" : "Call incorrect"
  }

  return callWasCorrect(record) ? "Successful" : "Unsuccessful"
}

export function emptyBenchmarkOutcomes() {
  return { d1: null, w1: null, m1: null, m3: null, m6: null, m12: null }
}
