import type { Holding, RecommendationRecord, Transaction } from "./types"
import { buildScenarios } from "./scenarios"
import { getInstrument } from "./universe"

// Seed portfolio — editable in the app. Illustrative demo positions only.
export const SEED_HOLDINGS: Holding[] = [
  { ticker: "VT", quantity: 200, avgCost: 101.2 },
  { ticker: "GLD", quantity: 30, avgCost: 198.4 },
  { ticker: "MLPX", quantity: 150, avgCost: 47.9 },
  { ticker: "TSM", quantity: 60, avgCost: 149.6 },
  { ticker: "AMD", quantity: 30, avgCost: 156.3 },
  { ticker: "INTC", quantity: 120, avgCost: 33.8 },
]

export const SEED_CASH = 8250

export const SEED_TRANSACTIONS: Transaction[] = [
  { id: "t1", date: "2025-06-02", ticker: "CASH", type: "Deposit", quantity: 40000, price: 1, currency: "USD", brokerageFee: 0, fxFee: 0, notes: "Initial funding" },
  { id: "t2", date: "2025-06-10", ticker: "VT", type: "Buy", quantity: 200, price: 101.2, currency: "USD", brokerageFee: 3, fxFee: 0, notes: "Core global allocation" },
  { id: "t3", date: "2025-07-15", ticker: "GLD", type: "Buy", quantity: 30, price: 198.4, currency: "USD", brokerageFee: 3, fxFee: 0, notes: "Inflation / safe-haven hedge" },
  { id: "t4", date: "2025-08-01", ticker: "MLPX", type: "Buy", quantity: 150, price: 47.9, currency: "USD", brokerageFee: 3, fxFee: 0, notes: "Energy income sleeve" },
  { id: "t5", date: "2025-09-12", ticker: "TSM", type: "Buy", quantity: 60, price: 149.6, currency: "USD", brokerageFee: 3, fxFee: 1.2, notes: "AI foundry exposure" },
  { id: "t6", date: "2025-10-20", ticker: "AMD", type: "Buy", quantity: 40, price: 156.3, currency: "USD", brokerageFee: 3, fxFee: 0.8, notes: "Data-center compute" },
  { id: "t7", date: "2025-11-05", ticker: "INTC", type: "Buy", quantity: 120, price: 33.8, currency: "USD", brokerageFee: 3, fxFee: 0, notes: "Turnaround / foundry optionality" },
  { id: "t8", date: "2025-12-18", ticker: "MLPX", type: "Dividend", quantity: 150, price: 0.62, currency: "USD", brokerageFee: 0, fxFee: 0, notes: "Quarterly distribution" },
  { id: "t9", date: "2026-01-22", ticker: "AMD", type: "Sell", quantity: 10, price: 168.5, currency: "USD", brokerageFee: 3, fxFee: 0.9, notes: "Trimmed on strength to manage weight" },
]

function rec(
  id: string,
  datetime: string,
  ticker: string,
  score: number,
  recommendation: RecommendationRecord["recommendation"],
  outcomes: RecommendationRecord["outcomes"],
): RecommendationRecord {
  const inst = getInstrument(ticker)!
  const scenarios = buildScenarios(inst, {
    macro: 60, geopolitics: 50, earnings: 70, fundamentals: 70, valuation: 50, quality: 80,
    flows: 70, technical: 70, portfolioFit: 60, timing: 60, psychology: 60, opportunityCost: 60,
  }, score)
  return {
    id,
    datetime,
    ticker,
    type: inst.type,
    priceAtRec: inst.price * (0.85 + Math.random() * 0.1),
    overallScore: score,
    recommendation,
    suggestedWeight: inst.type === "etf" ? 12 : 6,
    confidence: 70 + (score - 60) / 4,
    reasons: [`${inst.name} scored ${score}/100 with supportive trend and macro.`, "Portfolio fit within limits at time of recommendation."],
    risks: ["Sector concentration", "Valuation sensitivity to guidance"],
    scenarios,
    modelVersion: "dios-analyst-1.0.0",
    scoringVersion: "dios-scoring-2026.02",
    sector: inst.sector,
    macroRegime: "Late-cycle expansion",
    outcomes,
  }
}

export const SEED_RECOMMENDATIONS: RecommendationRecord[] = [
  rec("r1", "2025-08-14T10:15:00-04:00", "NVDA", 86, "Strong Buy", { d1: 1.2, w1: 3.4, m1: 8.1, m3: 19.2, m6: 31.5, m12: null }),
  rec("r2", "2025-09-03T11:02:00-04:00", "TSM", 81, "Buy", { d1: 0.6, w1: 2.1, m1: 5.5, m3: 14.8, m6: 22.3, m12: null }),
  rec("r3", "2025-09-28T09:45:00-04:00", "INTC", 44, "Avoid", { d1: -0.9, w1: -2.8, m1: -6.4, m3: -11.2, m6: -14.7, m12: null }),
  rec("r4", "2025-10-11T14:20:00-04:00", "GLD", 72, "Buy", { d1: 0.4, w1: 1.6, m1: 4.2, m3: 9.9, m6: null, m12: null }),
  rec("r5", "2025-11-19T10:05:00-05:00", "SMH", 78, "Buy Watch", { d1: 0.8, w1: 2.9, m1: 7.7, m3: null, m6: null, m12: null }),
  rec("r6", "2025-12-05T13:30:00-05:00", "AMD", 68, "Start Small", { d1: -0.3, w1: 1.1, m1: 3.8, m3: null, m6: null, m12: null }),
  rec("r7", "2026-01-15T09:50:00-05:00", "VOO", 74, "Buy", { d1: 0.3, w1: 1.4, m1: 2.6, m3: null, m6: null, m12: null }),
  rec("r8", "2026-02-02T11:15:00-05:00", "MU", 66, "Start Small", { d1: 1.5, w1: null, m1: null, m3: null, m6: null, m12: null }),
]
