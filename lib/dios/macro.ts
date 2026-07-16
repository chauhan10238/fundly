import type { Settings } from "./types"

export interface MacroState {
  regime: string
  regimeScore: number // 0-100, higher = more supportive of risk assets
  summary: string
  drivers: { label: string; value: string; trend: "up" | "down" | "flat" }[]
}

export interface GeoState {
  level: "Low" | "Moderate" | "Elevated" | "High"
  score: number // 0-100, higher = calmer
  summary: string
  hotspots: { region: string; note: string; severity: "low" | "medium" | "high" }[]
}

// Illustrative demo macro regime.
export const MACRO: MacroState = {
  regime: "Late-cycle expansion, easing bias",
  regimeScore: 62,
  summary:
    "Growth is decelerating but positive, disinflation is intact, and the Federal Reserve has signalled a gradual easing path. Liquidity is supportive for quality equities while long-duration assets remain rate-sensitive.",
  drivers: [
    { label: "US Real GDP (QoQ ann.)", value: "2.1%", trend: "down" },
    { label: "Core PCE (YoY)", value: "2.6%", trend: "down" },
    { label: "Fed Funds target", value: "3.75-4.00%", trend: "down" },
    { label: "10Y Treasury", value: "4.05%", trend: "flat" },
    { label: "Unemployment", value: "4.3%", trend: "up" },
    { label: "USD Index (DXY)", value: "102.4", trend: "down" },
  ],
}

export const GEO: GeoState = {
  level: "Elevated",
  score: 48,
  summary:
    "Trade and export-control tensions around advanced semiconductors persist, and regional conflicts keep energy and defense sensitivities high. Supply chains for foundries remain a concentrated risk.",
  hotspots: [
    { region: "Taiwan Strait", note: "Foundry supply concentration risk for TSM and downstream chips", severity: "high" },
    { region: "US-China tech", note: "Export controls affect semiconductor equipment and AI accelerators", severity: "high" },
    { region: "Middle East", note: "Energy price volatility risk", severity: "medium" },
    { region: "Eastern Europe", note: "Defense spending tailwind, commodity disruption risk", severity: "medium" },
  ],
}

export const DEFAULT_SETTINGS: Settings = {
  currency: "USD",
  defaultHorizon: "3-5 years",
  maxStockWeight: 10,
  maxSectorEtfWeight: 15,
  maxSectorExposure: 35,
  maxLeveragedWeight: 3,
  minBuyScore: 65,
  minStrongBuyScore: 80,
  riskTolerance: "medium",
  dataRefreshMinutes: 60,
  marketDataProvider: "demo",
  weights: {
    macro: 12,
    geopolitics: 8,
    earnings: 13,
    fundamentals: 13,
    valuation: 10,
    quality: 10,
    flows: 8,
    technical: 8,
    portfolioFit: 10,
    timing: 4,
    psychology: 2,
    opportunityCost: 2,
  },
}

export const LAST_REFRESH = "2026-02-16T09:32:00-05:00"

export const MARKET_TAPE: { label: string; value: string; change: number }[] = [
  { label: "S&P", value: "5,942", change: 0.34 },
  { label: "NDX", value: "21,180", change: 0.61 },
  { label: "VIX", value: "16.2", change: -3.1 },
  { label: "AUD/USD", value: "0.6612", change: -0.18 },
]
