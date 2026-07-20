import { getInstrument } from "./universe"
import type { Holding, Instrument, Settings, Transaction } from "./types"
import { changePct } from "../format"

const MIN_POSITION_QTY = 0.001

export interface LiveQuote {
  symbol: string
  name?: string
  price: number
  previousClose: number
  change?: number
  changePercent?: number
  timestamp?: number | null
}

export type LiveQuoteMap = Record<string, LiveQuote>

export interface Position {
  ticker: string
  instrument: Instrument
  quantity: number
  avgCost: number
  price: number
  marketValue: number
  costBasis: number
  unrealisedPL: number
  unrealisedPLPct: number
  weight: number
  dayChangePct: number
  dayChangeValue: number
  priceSource: "live" | "demo"
  quoteTimestamp: number | null
}

export interface Allocation {
  label: string
  value: number
  pct: number
}

export interface ExposureAnalytics {
  sector: Allocation[]
  country: Allocation[]
  type: Allocation[]
  currency: Allocation[]
  theme: Allocation[]
  lookThrough: Allocation[] // top underlying company exposure (direct + ETF look-through)
  semiconductor: number
  energy: number
  gold: number
}

export interface RiskWarning {
  id: string
  severity: "high" | "medium" | "low"
  title: string
  detail: string
}

export interface PortfolioSummary {
  positions: Position[]
  totalValue: number
  investedValue: number
  cash: number
  costBasis: number
  totalPL: number
  totalPLPct: number
  dayChangeValue: number
  dayChangePct: number
  largestPosition?: Position
  largestSector?: Allocation
  exposure: ExposureAnalytics
  warnings: RiskWarning[]
}

function pushAllocation(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value)
}

function toAllocations(map: Map<string, number>, total: number): Allocation[] {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value, pct: total ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
}

export function buildPositions(holdings: Holding[], liveQuotes: LiveQuoteMap = {}): Position[] {
  const positions: Position[] = []
  for (const h of holdings) {
    const instrument = getInstrument(h.ticker)
    if (!instrument || h.quantity <= MIN_POSITION_QTY) continue

    const quote = liveQuotes[instrument.ticker]
    const price = quote?.price ?? instrument.price
    const prevClose = quote?.previousClose ?? instrument.prevClose
    const marketValue = price * h.quantity
    const costBasis = h.avgCost * h.quantity
    const dayChangePct =
      typeof quote?.changePercent === "number"
        ? quote.changePercent
        : changePct(price, prevClose)
    const dayChangeValue = (price - prevClose) * h.quantity

    positions.push({
      ticker: instrument.ticker,
      instrument,
      quantity: h.quantity,
      avgCost: h.avgCost,
      price,
      marketValue,
      costBasis,
      unrealisedPL: marketValue - costBasis,
      unrealisedPLPct: costBasis ? ((marketValue - costBasis) / costBasis) * 100 : 0,
      weight: 0,
      dayChangePct,
      dayChangeValue,
      priceSource: quote ? "live" : "demo",
      quoteTimestamp: quote?.timestamp ?? null,
    })
  }
  return positions
}

export function computeExposure(positions: Position[], investedValue: number): ExposureAnalytics {
  const sector = new Map<string, number>()
  const country = new Map<string, number>()
  const type = new Map<string, number>()
  const currency = new Map<string, number>()
  const theme = new Map<string, number>()
  const lookThrough = new Map<string, number>()

  for (const p of positions) {
    const inst = p.instrument
    pushAllocation(sector, inst.sector, p.marketValue)
    pushAllocation(country, inst.country, p.marketValue)
    pushAllocation(type, inst.type === "etf" ? "ETF" : "Stock", p.marketValue)
    pushAllocation(currency, inst.currency, p.marketValue)
    for (const t of inst.themes ?? []) pushAllocation(theme, t, p.marketValue)

    // look-through: direct stock holdings count fully; ETFs decompose by holdings map
    if (inst.type === "stock") {
      pushAllocation(lookThrough, inst.ticker, p.marketValue)
    } else if (inst.holdings) {
      for (const [under, w] of Object.entries(inst.holdings)) {
        pushAllocation(lookThrough, under, p.marketValue * w)
      }
    }
  }

  const themeTotal = investedValue
  const semiconductor = ((theme.get("semiconductors") ?? 0) / (themeTotal || 1)) * 100
  const energy = ((theme.get("energy") ?? 0) / (themeTotal || 1)) * 100
  const gold = ((theme.get("gold") ?? 0) / (themeTotal || 1)) * 100

  return {
    sector: toAllocations(sector, investedValue),
    country: toAllocations(country, investedValue),
    type: toAllocations(type, investedValue),
    currency: toAllocations(currency, investedValue),
    theme: toAllocations(theme, investedValue),
    lookThrough: toAllocations(lookThrough, investedValue).slice(0, 12),
    semiconductor,
    energy,
    gold,
  }
}

export function computeWarnings(
  positions: Position[],
  exposure: ExposureAnalytics,
  settings: Settings,
): RiskWarning[] {
  const warnings: RiskWarning[] = []

  for (const p of positions) {
    if (p.instrument.type === "stock" && p.weight > settings.maxStockWeight) {
      warnings.push({
        id: `stock-weight-${p.ticker}`,
        severity: "high",
        title: `${p.ticker} exceeds single-stock limit`,
        detail: `${p.ticker} is ${p.weight.toFixed(1)}% of the portfolio, above the ${settings.maxStockWeight}% maximum single-stock rule.`,
      })
    }
    if (p.instrument.leveraged && p.weight > settings.maxLeveragedWeight) {
      warnings.push({
        id: `lev-${p.ticker}`,
        severity: "high",
        title: `Leveraged ETF ${p.ticker} above limit`,
        detail: `${p.ticker} is a leveraged product at ${p.weight.toFixed(1)}%, above the ${settings.maxLeveragedWeight}% tactical cap.`,
      })
    }
    if (p.unrealisedPLPct < -12) {
      warnings.push({
        id: `thesis-${p.ticker}`,
        severity: "medium",
        title: `${p.ticker} thesis under pressure`,
        detail: `${p.ticker} is down ${Math.abs(p.unrealisedPLPct).toFixed(1)}% versus cost. Do not average down without a documented thesis improvement.`,
      })
    }
  }

  for (const s of exposure.sector) {
    if (s.pct > settings.maxSectorExposure) {
      warnings.push({
        id: `sector-${s.label}`,
        severity: "high",
        title: `${s.label} exposure above ${settings.maxSectorExposure}%`,
        detail: `${s.label} is ${s.pct.toFixed(1)}% of invested assets, above the ${settings.maxSectorExposure}% sector concentration limit.`,
      })
    }
  }

  if (exposure.semiconductor > 25) {
    warnings.push({
      id: "semis",
      severity: "medium",
      title: "Elevated semiconductor exposure",
      detail: `Direct and look-through semiconductor exposure is roughly ${exposure.semiconductor.toFixed(0)}% of invested assets. New chip positions increase concentration.`,
    })
  }

  const usa = exposure.country.find((c) => c.label === "United States")
  if (usa && usa.pct > 65) {
    warnings.push({
      id: "country",
      severity: "low",
      title: "High single-country concentration",
      detail: `United States exposure is ${usa.pct.toFixed(0)}% of invested assets. Consider ex-US diversification.`,
    })
  }

  // ETF overlap warning: if two ETFs share meaningful underlyings
  const etfs = positions.filter((p) => p.instrument.type === "etf" && p.instrument.holdings)
  if (etfs.length >= 2) {
    const shared = new Set<string>()
    for (let i = 0; i < etfs.length; i++) {
      for (let j = i + 1; j < etfs.length; j++) {
        const a = etfs[i].instrument.holdings ?? {}
        const b = etfs[j].instrument.holdings ?? {}
        for (const k of Object.keys(a)) if (b[k]) shared.add(k)
      }
    }
    if (shared.size >= 3) {
      warnings.push({
        id: "overlap",
        severity: "low",
        title: "ETF holdings overlap detected",
        detail: `Held ETFs share underlying names (${Array.from(shared).slice(0, 5).join(", ")}). Look-through exposure is higher than headline weights suggest.`,
      })
    }
  }

  return warnings
}

export function buildPortfolio(
  holdings: Holding[],
  cash: number,
  settings: Settings,
  liveQuotes: LiveQuoteMap = {},
): PortfolioSummary {
  const positions = buildPositions(holdings, liveQuotes)
  const investedValue = positions.reduce((s, p) => s + p.marketValue, 0)
  const totalValue = investedValue + cash
  const costBasis = positions.reduce((s, p) => s + p.costBasis, 0)
  const dayChangeValue = positions.reduce((s, p) => s + p.dayChangeValue, 0)
  const prevValue = totalValue - dayChangeValue

  for (const p of positions) p.weight = totalValue ? (p.marketValue / totalValue) * 100 : 0

  const exposure = computeExposure(positions, investedValue)
  const warnings = computeWarnings(positions, exposure, settings)

  const sortedByValue = [...positions].sort((a, b) => b.marketValue - a.marketValue)

  return {
    positions: sortedByValue,
    totalValue,
    investedValue,
    cash,
    costBasis,
    totalPL: investedValue - costBasis,
    totalPLPct: costBasis ? ((investedValue - costBasis) / costBasis) * 100 : 0,
    dayChangeValue,
    dayChangePct: prevValue ? (dayChangeValue / prevValue) * 100 : 0,
    largestPosition: sortedByValue[0],
    largestSector: exposure.sector[0],
    exposure,
    warnings,
  }
}

// Weighted-average-cost recomputation from raw transactions.
export interface DerivedPosition {
  ticker: string
  quantity: number
  avgCost: number
  realisedPL: number
}

export function deriveHoldingsFromTransactions(transactions: Transaction[]): {
  holdings: Holding[]
  realisedByTicker: Record<string, number>
  cashDelta: number
} {
  const map = new Map<string, DerivedPosition>()
  let cashDelta = 0
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))

  for (const t of sorted) {
    const fees = (t.brokerageFee ?? 0) + (t.fxFee ?? 0)
    if (t.type === "Deposit") { cashDelta += t.quantity * (t.price || 1) - fees; continue }
    if (t.type === "Withdrawal") { cashDelta -= t.quantity * (t.price || 1) + fees; continue }
    if (t.type === "Fee") { cashDelta -= t.quantity || fees; continue }

    const pos = map.get(t.ticker) ?? { ticker: t.ticker, quantity: 0, avgCost: 0, realisedPL: 0 }

    if (t.type === "Dividend") {
      cashDelta += t.quantity * t.price - fees
      map.set(t.ticker, pos)
      continue
    }
    if (t.type === "Buy") {
      const newQty = pos.quantity + t.quantity
      const newCost =
        pos.avgCost * pos.quantity +
        t.price * t.quantity +
        fees
      pos.avgCost = newQty ? newCost / newQty : 0
      pos.quantity = newQty
      cashDelta -= t.price * t.quantity + fees
    } else if (t.type === "Sell") {
      const soldQuantity = Math.min(t.quantity, pos.quantity)
      pos.realisedPL +=
        (t.price - pos.avgCost) * soldQuantity - fees
      pos.quantity -= soldQuantity
      cashDelta += t.price * soldQuantity - fees

      const closeTolerance = Math.max(MIN_POSITION_QTY, (pos.quantity + soldQuantity) * 0.001)
      if (pos.quantity <= closeTolerance) pos.quantity = 0
    }
    map.set(t.ticker, pos)
  }

  const holdings: Holding[] = []
  const realisedByTicker: Record<string, number> = {}
  for (const p of map.values()) {
    realisedByTicker[p.ticker] = p.realisedPL
    if (p.quantity > MIN_POSITION_QTY) holdings.push({ ticker: p.ticker, quantity: p.quantity, avgCost: p.avgCost })
  }
  return { holdings, realisedByTicker, cashDelta }
}
