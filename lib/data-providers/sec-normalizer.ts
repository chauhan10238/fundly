import type {
  FinancialHealth,
  FinancialMetric,
  GrowthMetric,
  HealthPillar,
  NormalizedFundamentals,
} from "./normalized-types"
import type { SecCompanyFacts } from "./types"

type FactPoint = {
  val?: number
  end?: string
  start?: string
  filed?: string
  form?: string
  fp?: string
  fy?: number
  frame?: string
  accn?: string
}

type FactConcept = {
  label?: string
  description?: string
  units?: Record<string, FactPoint[]>
}

const TAGS = {
  revenue: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
  ],
  grossProfit: ["GrossProfit"],
  operatingIncome: ["OperatingIncomeLoss"],
  netIncome: ["NetIncomeLoss", "ProfitLoss"],
  operatingCashFlow: ["NetCashProvidedByUsedInOperatingActivities"],
  capex: [
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsForAdditionsToPropertyPlantAndEquipment",
  ],
  cash: [
    "CashAndCashEquivalentsAtCarryingValue",
    "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
  ],
  debtCurrent: [
    "ShortTermBorrowings",
    "LongTermDebtCurrent",
    "ShortTermDebtCurrent",
  ],
  debtLongTerm: [
    "LongTermDebtNoncurrent",
    "LongTermDebt",
  ],
  assets: ["Assets"],
  liabilities: ["Liabilities"],
  equity: [
    "StockholdersEquity",
    "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
  ],
  currentAssets: ["AssetsCurrent"],
  currentLiabilities: ["LiabilitiesCurrent"],
  shares: [
    "CommonStockSharesOutstanding",
    "EntityCommonStockSharesOutstanding",
    "WeightedAverageNumberOfDilutedSharesOutstanding",
  ],
  epsDiluted: ["EarningsPerShareDiluted"],
} as const

function usGaapFacts(companyFacts: SecCompanyFacts): Record<string, FactConcept> {
  const raw = companyFacts.facts as Record<string, unknown>
  return (raw?.["us-gaap"] ?? {}) as Record<string, FactConcept>
}

function pointsFor(
  facts: Record<string, FactConcept>,
  tags: readonly string[],
  preferredUnits: string[],
): Array<FactPoint & { unit: string }> {
  for (const tag of tags) {
    const concept = facts[tag]
    if (!concept?.units) continue

    const unit =
      preferredUnits.find((candidate) => concept.units?.[candidate]?.length) ??
      Object.keys(concept.units)[0]

    if (!unit) continue

    const points = (concept.units[unit] ?? [])
      .filter((point) => Number.isFinite(point.val))
      .map((point) => ({ ...point, unit }))

    if (points.length) return points
  }
  return []
}

function dedupe(points: Array<FactPoint & { unit: string }>) {
  const map = new Map<string, FactPoint & { unit: string }>()

  for (const point of points) {
    const key = `${point.end}|${point.start ?? ""}|${point.fy ?? ""}|${point.fp ?? ""}`
    const existing = map.get(key)
    if (!existing || (point.filed ?? "") > (existing.filed ?? "")) {
      map.set(key, point)
    }
  }

  return [...map.values()].sort((a, b) => {
    const byEnd = (b.end ?? "").localeCompare(a.end ?? "")
    return byEnd || (b.filed ?? "").localeCompare(a.filed ?? "")
  })
}

function durationDays(point: FactPoint): number | undefined {
  if (!point.start || !point.end) return undefined
  const start = Date.parse(point.start)
  const end = Date.parse(point.end)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined
  return Math.round((end - start) / 86_400_000)
}

function quarterlyPoints(points: Array<FactPoint & { unit: string }>) {
  return dedupe(points).filter((point) => {
    const days = durationDays(point)
    return (
      point.form === "10-Q" &&
      days !== undefined &&
      days >= 70 &&
      days <= 120
    )
  })
}

function annualPoints(points: Array<FactPoint & { unit: string }>) {
  return dedupe(points).filter((point) => {
    const days = durationDays(point)
    return (
      point.form === "10-K" &&
      days !== undefined &&
      days >= 300 &&
      days <= 430
    )
  })
}

function latestInstant(points: Array<FactPoint & { unit: string }>): FinancialMetric {
  const point = dedupe(points).find((item) =>
    ["10-K", "10-Q", "20-F", "40-F"].includes(item.form ?? ""),
  )
  return point
    ? {
        value: point.val,
        period: point.end,
        filed: point.filed,
        form: point.form,
        unit: point.unit,
      }
    : {}
}

function sumLatestFourQuarters(points: Array<FactPoint & { unit: string }>): FinancialMetric {
  const quarters = quarterlyPoints(points)
  if (quarters.length >= 4) {
    const selected = quarters.slice(0, 4)
    return {
      value: selected.reduce((sum, point) => sum + (point.val ?? 0), 0),
      period: `${selected[3].end} to ${selected[0].end}`,
      filed: selected[0].filed,
      form: "TTM",
      unit: selected[0].unit,
    }
  }

  const annual = annualPoints(points)[0]
  return annual
    ? {
        value: annual.val,
        period: annual.end,
        filed: annual.filed,
        form: annual.form,
        unit: annual.unit,
      }
    : {}
}

function annualGrowth(points: Array<FactPoint & { unit: string }>): GrowthMetric | undefined {
  const annual = annualPoints(points)
  if (annual.length < 2 || annual[1].val === 0) return undefined

  const current = annual[0].val
  const previous = annual[1].val
  if (current === undefined || previous === undefined) return undefined

  return {
    current,
    previous,
    changePercent: ((current - previous) / Math.abs(previous)) * 100,
  }
}

function ratio(numerator?: number, denominator?: number): number | undefined {
  if (
    numerator === undefined ||
    denominator === undefined ||
    denominator === 0
  ) return undefined
  return numerator / denominator
}

function percent(numerator?: number, denominator?: number): number | undefined {
  const value = ratio(numerator, denominator)
  return value === undefined ? undefined : value * 100
}

function sumDefined(...values: Array<number | undefined>): number | undefined {
  const defined = values.filter((value): value is number => value !== undefined)
  return defined.length ? defined.reduce((sum, value) => sum + value, 0) : undefined
}

export function normalizeSecCompanyFacts(
  companyFacts: SecCompanyFacts,
): NormalizedFundamentals {
  const facts = usGaapFacts(companyFacts)

  const revenue = sumLatestFourQuarters(pointsFor(facts, TAGS.revenue, ["USD"]))
  const grossProfit = sumLatestFourQuarters(pointsFor(facts, TAGS.grossProfit, ["USD"]))
  const operatingIncome = sumLatestFourQuarters(pointsFor(facts, TAGS.operatingIncome, ["USD"]))
  const netIncome = sumLatestFourQuarters(pointsFor(facts, TAGS.netIncome, ["USD"]))
  const operatingCashFlow = sumLatestFourQuarters(pointsFor(facts, TAGS.operatingCashFlow, ["USD"]))
  const capex = sumLatestFourQuarters(pointsFor(facts, TAGS.capex, ["USD"]))

  const cash = latestInstant(pointsFor(facts, TAGS.cash, ["USD"]))
  const debtCurrent = latestInstant(pointsFor(facts, TAGS.debtCurrent, ["USD"]))
  const debtLongTerm = latestInstant(pointsFor(facts, TAGS.debtLongTerm, ["USD"]))
  const assets = latestInstant(pointsFor(facts, TAGS.assets, ["USD"]))
  const liabilities = latestInstant(pointsFor(facts, TAGS.liabilities, ["USD"]))
  const equity = latestInstant(pointsFor(facts, TAGS.equity, ["USD"]))
  const currentAssets = latestInstant(pointsFor(facts, TAGS.currentAssets, ["USD"]))
  const currentLiabilities = latestInstant(pointsFor(facts, TAGS.currentLiabilities, ["USD"]))
  const shares = latestInstant(pointsFor(facts, TAGS.shares, ["shares"]))
  const eps = sumLatestFourQuarters(pointsFor(facts, TAGS.epsDiluted, ["USD/shares"]))

  const totalDebt = sumDefined(debtCurrent.value, debtLongTerm.value)
  const freeCashFlow =
    operatingCashFlow.value !== undefined
      ? operatingCashFlow.value - Math.abs(capex.value ?? 0)
      : undefined

  const sourceDates = [
    revenue.filed,
    cash.filed,
    assets.filed,
    equity.filed,
  ].filter((value): value is string => Boolean(value))

  return {
    entityName: companyFacts.entityName,
    currency: "USD",
    revenueTTM: revenue.value,
    revenueGrowth: annualGrowth(pointsFor(facts, TAGS.revenue, ["USD"])),
    grossProfitTTM: grossProfit.value,
    operatingIncomeTTM: operatingIncome.value,
    netIncomeTTM: netIncome.value,
    netIncomeGrowth: annualGrowth(pointsFor(facts, TAGS.netIncome, ["USD"])),
    operatingCashFlowTTM: operatingCashFlow.value,
    capitalExpenditureTTM: capex.value,
    freeCashFlowTTM: freeCashFlow,
    cash: cash.value,
    totalDebt,
    assets: assets.value,
    liabilities: liabilities.value,
    equity: equity.value,
    sharesOutstanding: shares.value,
    epsDilutedTTM: eps.value,
    bookValuePerShare: ratio(equity.value, shares.value),
    grossMargin: percent(grossProfit.value, revenue.value),
    operatingMargin: percent(operatingIncome.value, revenue.value),
    profitMargin: percent(netIncome.value, revenue.value),
    freeCashFlowMargin: percent(freeCashFlow, revenue.value),
    returnOnEquity: percent(netIncome.value, equity.value),
    debtToEquity: ratio(totalDebt, equity.value),
    currentRatio: ratio(currentAssets.value, currentLiabilities.value),
    sourcePeriod: revenue.period ?? assets.period,
    latestFiled: sourceDates.sort().at(-1),
  }
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function status(score: number): HealthPillar["status"] {
  if (score >= 80) return "strong"
  if (score >= 65) return "healthy"
  if (score >= 45) return "watch"
  return "weak"
}

function availableAverage(values: Array<number | undefined>, fallback = 50) {
  const available = values.filter((value): value is number => value !== undefined)
  return available.length
    ? available.reduce((sum, value) => sum + value, 0) / available.length
    : fallback
}

function scoreMargin(value?: number, strong = 20, weak = 5) {
  if (value === undefined) return undefined
  return clamp(((value - weak) / Math.max(strong - weak, 1)) * 45 + 50)
}

function scoreGrowth(value?: number) {
  if (value === undefined) return undefined
  return clamp(55 + value * 2)
}

export function calculateFinancialHealth(
  fundamentals: NormalizedFundamentals,
): FinancialHealth {
  const profitabilityScore = availableAverage([
    scoreMargin(fundamentals.grossMargin, 45, 20),
    scoreMargin(fundamentals.operatingMargin, 25, 5),
    scoreMargin(fundamentals.profitMargin, 20, 3),
    fundamentals.returnOnEquity === undefined
      ? undefined
      : clamp(50 + fundamentals.returnOnEquity * 1.5),
  ])

  const cashFlowScore = availableAverage([
    scoreMargin(fundamentals.freeCashFlowMargin, 20, 3),
    fundamentals.freeCashFlowTTM === undefined
      ? undefined
      : fundamentals.freeCashFlowTTM > 0
        ? 82
        : 25,
    fundamentals.operatingCashFlowTTM === undefined ||
    fundamentals.netIncomeTTM === undefined ||
    fundamentals.netIncomeTTM === 0
      ? undefined
      : clamp(
          55 +
            ((fundamentals.operatingCashFlowTTM /
              Math.abs(fundamentals.netIncomeTTM)) -
              1) *
              30,
        ),
  ])

  const balanceScore = availableAverage([
    fundamentals.debtToEquity === undefined
      ? undefined
      : clamp(95 - fundamentals.debtToEquity * 35),
    fundamentals.currentRatio === undefined
      ? undefined
      : clamp(40 + fundamentals.currentRatio * 30),
    fundamentals.cash === undefined || fundamentals.totalDebt === undefined
      ? undefined
      : fundamentals.cash >= fundamentals.totalDebt
        ? 90
        : clamp(70 - ((fundamentals.totalDebt - fundamentals.cash) /
            Math.max(fundamentals.totalDebt, 1)) * 40),
  ])

  const growthScore = availableAverage([
    scoreGrowth(fundamentals.revenueGrowth?.changePercent),
    scoreGrowth(fundamentals.netIncomeGrowth?.changePercent),
  ])

  const efficiencyScore = availableAverage([
    fundamentals.returnOnEquity === undefined
      ? undefined
      : clamp(45 + fundamentals.returnOnEquity * 1.8),
    fundamentals.operatingMargin === undefined
      ? undefined
      : clamp(45 + fundamentals.operatingMargin * 2),
  ])

  const pillars: HealthPillar[] = [
    {
      name: "Profitability",
      score: clamp(profitabilityScore),
      status: status(profitabilityScore),
      explanation: `Profit margin ${fundamentals.profitMargin?.toFixed(1) ?? "—"}%; ROE ${fundamentals.returnOnEquity?.toFixed(1) ?? "—"}%.`,
    },
    {
      name: "Cash Flow",
      score: clamp(cashFlowScore),
      status: status(cashFlowScore),
      explanation: `Free cash flow margin ${fundamentals.freeCashFlowMargin?.toFixed(1) ?? "—"}%.`,
    },
    {
      name: "Balance Sheet",
      score: clamp(balanceScore),
      status: status(balanceScore),
      explanation: `Debt/equity ${fundamentals.debtToEquity?.toFixed(2) ?? "—"}; current ratio ${fundamentals.currentRatio?.toFixed(2) ?? "—"}.`,
    },
    {
      name: "Growth",
      score: clamp(growthScore),
      status: status(growthScore),
      explanation: `Revenue growth ${fundamentals.revenueGrowth?.changePercent?.toFixed(1) ?? "—"}%; net income growth ${fundamentals.netIncomeGrowth?.changePercent?.toFixed(1) ?? "—"}%.`,
    },
    {
      name: "Efficiency",
      score: clamp(efficiencyScore),
      status: status(efficiencyScore),
      explanation: "Operating efficiency based on margins and return on equity.",
    },
  ]

  const score = clamp(
    pillars.reduce((sum, pillar) => sum + pillar.score, 0) / pillars.length,
  )

  const strengths: string[] = []
  const risks: string[] = []

  if ((fundamentals.freeCashFlowTTM ?? 0) > 0) strengths.push("Positive free cash flow")
  if ((fundamentals.profitMargin ?? 0) >= 15) strengths.push("Strong profit margin")
  if ((fundamentals.cash ?? 0) >= (fundamentals.totalDebt ?? Number.POSITIVE_INFINITY)) {
    strengths.push("Cash covers reported debt")
  }
  if ((fundamentals.revenueGrowth?.changePercent ?? 0) > 5) strengths.push("Positive annual revenue growth")
  if ((fundamentals.debtToEquity ?? 0) > 1.5) risks.push("Elevated debt relative to equity")
  if ((fundamentals.revenueGrowth?.changePercent ?? 0) < 0) risks.push("Annual revenue declined")
  if ((fundamentals.netIncomeGrowth?.changePercent ?? 0) < 0) risks.push("Annual net income declined")
  if ((fundamentals.freeCashFlowTTM ?? 0) < 0) risks.push("Negative free cash flow")

  return {
    score,
    label:
      score >= 85 ? "Excellent" :
      score >= 70 ? "Strong" :
      score >= 50 ? "Fair" : "Weak",
    pillars,
    strengths: strengths.slice(0, 4),
    risks: risks.slice(0, 4),
  }
}
