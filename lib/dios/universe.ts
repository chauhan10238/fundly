import type { Instrument } from "./types"

export const MODEL_VERSION = "dios-analyst-1.0.0"
export const SCORING_VERSION = "dios-scoring-2026.02"

// Deterministic demo universe. All prices and figures are illustrative sample
// data and must never be treated as live market data.
const list: Instrument[] = [
  // ---------- CORE ETFs ----------
  {
    ticker: "VT", name: "Vanguard Total World Stock ETF", type: "etf",
    sector: "Diversified", industry: "Global Equity", country: "Global", currency: "USD",
    tags: ["core"], riskBand: "low", price: 118.4, prevClose: 117.9,
    qualityHint: 88, valuationHint: 55, growthHint: 60, momentumHint: 62,
    themes: ["global", "broad-market"],
    holdings: { AAPL: 0.041, MSFT: 0.039, NVDA: 0.037, AMZN: 0.023, META: 0.017, GOOG: 0.016, AVGO: 0.013, TSM: 0.011 },
    nextEvent: "Quarterly rebalance", nextEventDate: "2026-03-31",
  },
  {
    ticker: "VOO", name: "Vanguard S&P 500 ETF", type: "etf",
    sector: "Diversified", industry: "US Large Cap", country: "United States", currency: "USD",
    tags: ["core"], riskBand: "low", price: 512.6, prevClose: 509.8,
    qualityHint: 90, valuationHint: 48, growthHint: 64, momentumHint: 70,
    themes: ["us-large-cap", "broad-market"],
    holdings: { AAPL: 0.069, MSFT: 0.066, NVDA: 0.062, AMZN: 0.039, META: 0.026, GOOG: 0.022, AVGO: 0.021, JPM: 0.013 },
    nextEvent: "Index rebalance", nextEventDate: "2026-03-20",
  },
  {
    ticker: "VTI", name: "Vanguard Total Stock Market ETF", type: "etf",
    sector: "Diversified", industry: "US Total Market", country: "United States", currency: "USD",
    tags: ["core"], riskBand: "low", price: 268.3, prevClose: 266.9,
    qualityHint: 89, valuationHint: 50, growthHint: 62, momentumHint: 68,
    themes: ["us-total-market", "broad-market"],
    holdings: { AAPL: 0.06, MSFT: 0.058, NVDA: 0.054, AMZN: 0.034, META: 0.023, GOOG: 0.02, AVGO: 0.018 },
  },
  {
    ticker: "QQQ", name: "Invesco QQQ Trust", type: "etf",
    sector: "Technology", industry: "Nasdaq 100", country: "United States", currency: "USD",
    tags: ["core", "growth"], riskBand: "medium", price: 458.2, prevClose: 452.1,
    qualityHint: 86, valuationHint: 38, growthHint: 78, momentumHint: 80,
    themes: ["us-large-cap", "technology", "growth"],
    holdings: { AAPL: 0.089, MSFT: 0.084, NVDA: 0.079, AMZN: 0.055, META: 0.041, AVGO: 0.041, GOOG: 0.05, TSM: 0 },
    nextEvent: "Nasdaq 100 rebalance", nextEventDate: "2026-03-20",
  },
  {
    ticker: "SCHD", name: "Schwab US Dividend Equity ETF", type: "etf",
    sector: "Diversified", industry: "US Dividend", country: "United States", currency: "USD",
    tags: ["core", "income", "defensive"], riskBand: "low", price: 28.7, prevClose: 28.5,
    qualityHint: 84, valuationHint: 66, growthHint: 40, momentumHint: 52,
    themes: ["dividend", "value"],
    holdings: { JPM: 0.04, AVGO: 0.043 },
  },
  {
    ticker: "GLD", name: "SPDR Gold Shares", type: "etf",
    sector: "Commodity", industry: "Precious Metals", country: "Global", currency: "USD",
    tags: ["commodity", "defensive"], riskBand: "medium", price: 242.1, prevClose: 239.4,
    qualityHint: 70, valuationHint: 52, growthHint: 30, momentumHint: 74,
    themes: ["gold", "inflation-hedge", "safe-haven"],
  },
  {
    ticker: "TLT", name: "iShares 20+ Year Treasury Bond ETF", type: "etf",
    sector: "Fixed Income", industry: "Long Treasury", country: "United States", currency: "USD",
    tags: ["income", "defensive"], riskBand: "medium", price: 92.3, prevClose: 91.6,
    qualityHint: 76, valuationHint: 60, growthHint: 20, momentumHint: 44,
    themes: ["rates", "duration", "safe-haven"],
  },
  {
    ticker: "IEF", name: "iShares 7-10 Year Treasury Bond ETF", type: "etf",
    sector: "Fixed Income", industry: "Intermediate Treasury", country: "United States", currency: "USD",
    tags: ["income", "defensive"], riskBand: "low", price: 95.1, prevClose: 94.8,
    qualityHint: 80, valuationHint: 58, growthHint: 18, momentumHint: 48,
    themes: ["rates", "duration"],
  },
  {
    ticker: "BND", name: "Vanguard Total Bond Market ETF", type: "etf",
    sector: "Fixed Income", industry: "Aggregate Bond", country: "United States", currency: "USD",
    tags: ["income", "defensive", "core"], riskBand: "low", price: 73.4, prevClose: 73.2,
    qualityHint: 82, valuationHint: 57, growthHint: 15, momentumHint: 46,
    themes: ["rates", "aggregate-bond"],
  },

  // ---------- SECTOR ETFs ----------
  {
    ticker: "SMH", name: "VanEck Semiconductor ETF", type: "etf",
    sector: "Technology", industry: "Semiconductors", country: "United States", currency: "USD",
    tags: ["sector", "growth"], riskBand: "high", price: 268.9, prevClose: 261.2,
    qualityHint: 85, valuationHint: 34, growthHint: 88, momentumHint: 86,
    themes: ["semiconductors", "ai", "technology"],
    holdings: { NVDA: 0.2, TSM: 0.12, AVGO: 0.09, AMD: 0.06, ASML: 0.05, AMAT: 0.05, LRCX: 0.045, MU: 0.04, INTC: 0.03 },
    nextEvent: "SOX index update", nextEventDate: "2026-03-15",
  },
  {
    ticker: "SOXX", name: "iShares Semiconductor ETF", type: "etf",
    sector: "Technology", industry: "Semiconductors", country: "United States", currency: "USD",
    tags: ["sector", "growth"], riskBand: "high", price: 238.4, prevClose: 231.9,
    qualityHint: 84, valuationHint: 36, growthHint: 86, momentumHint: 84,
    themes: ["semiconductors", "ai", "technology"],
    holdings: { NVDA: 0.09, AVGO: 0.09, AMD: 0.07, TSM: 0.045, AMAT: 0.06, LRCX: 0.05, MU: 0.045, INTC: 0.04, ASML: 0.02 },
  },
  {
    ticker: "SOXQ", name: "Invesco PHLX Semiconductor ETF", type: "etf",
    sector: "Technology", industry: "Semiconductors", country: "United States", currency: "USD",
    tags: ["sector", "growth"], riskBand: "high", price: 41.2, prevClose: 40.0,
    qualityHint: 82, valuationHint: 40, growthHint: 85, momentumHint: 83,
    themes: ["semiconductors", "ai", "technology"],
    holdings: { NVDA: 0.09, AVGO: 0.08, AMD: 0.07, TSM: 0.045, AMAT: 0.055, LRCX: 0.05, MU: 0.045, INTC: 0.04 },
  },
  {
    ticker: "XLK", name: "Technology Select Sector SPDR", type: "etf",
    sector: "Technology", industry: "US Technology", country: "United States", currency: "USD",
    tags: ["sector", "growth"], riskBand: "medium", price: 232.7, prevClose: 229.1,
    qualityHint: 88, valuationHint: 40, growthHint: 80, momentumHint: 82,
    themes: ["technology", "software", "semiconductors"],
    holdings: { MSFT: 0.14, AAPL: 0.135, NVDA: 0.13, AVGO: 0.05, AMD: 0.02 },
  },
  {
    ticker: "XLE", name: "Energy Select Sector SPDR", type: "etf",
    sector: "Energy", industry: "US Energy", country: "United States", currency: "USD",
    tags: ["sector", "commodity"], riskBand: "medium", price: 94.6, prevClose: 93.1,
    qualityHint: 74, valuationHint: 70, growthHint: 42, momentumHint: 58,
    themes: ["energy", "oil", "inflation-hedge"],
  },
  {
    ticker: "VDE", name: "Vanguard Energy ETF", type: "etf",
    sector: "Energy", industry: "US Broad Energy", country: "United States", currency: "USD",
    tags: ["sector", "commodity", "value"], riskBand: "medium", price: 170.22, prevClose: 170.22,
    qualityHint: 78, valuationHint: 68, growthHint: 46, momentumHint: 60,
    themes: ["energy", "oil", "gas", "inflation-hedge", "value"],
    holdings: { XOM: 0.22, CVX: 0.15, COP: 0.07, EOG: 0.04, WMB: 0.03 },
    nextEvent: "Quarterly distribution", nextEventDate: "2026-09-30",
  },
  {
    ticker: "MLPX", name: "Global X MLP & Energy Infrastructure ETF", type: "etf",
    sector: "Energy", industry: "Midstream Infrastructure", country: "United States", currency: "USD",
    tags: ["sector", "income", "commodity"], riskBand: "medium", price: 54.8, prevClose: 54.2,
    qualityHint: 72, valuationHint: 68, growthHint: 38, momentumHint: 60,
    themes: ["energy", "midstream", "income", "inflation-hedge"],
    nextEvent: "Distribution declaration", nextEventDate: "2026-03-05",
  },
  {
    ticker: "XLF", name: "Financial Select Sector SPDR", type: "etf",
    sector: "Financials", industry: "US Financials", country: "United States", currency: "USD",
    tags: ["sector"], riskBand: "medium", price: 48.9, prevClose: 48.3,
    qualityHint: 78, valuationHint: 64, growthHint: 48, momentumHint: 66,
    themes: ["financials", "banks"],
    holdings: { JPM: 0.1, "BRK.B": 0.13 },
  },
  {
    ticker: "XLV", name: "Health Care Select Sector SPDR", type: "etf",
    sector: "Health Care", industry: "US Health Care", country: "United States", currency: "USD",
    tags: ["sector", "defensive"], riskBand: "low", price: 146.2, prevClose: 145.1,
    qualityHint: 82, valuationHint: 66, growthHint: 44, momentumHint: 50,
    themes: ["healthcare", "defensive"],
  },
  {
    ticker: "XLI", name: "Industrial Select Sector SPDR", type: "etf",
    sector: "Industrials", industry: "US Industrials", country: "United States", currency: "USD",
    tags: ["sector"], riskBand: "medium", price: 138.4, prevClose: 137.2,
    qualityHint: 79, valuationHint: 58, growthHint: 50, momentumHint: 64,
    themes: ["industrials", "reshoring"],
  },
  {
    ticker: "XLP", name: "Consumer Staples Select Sector SPDR", type: "etf",
    sector: "Consumer Staples", industry: "US Staples", country: "United States", currency: "USD",
    tags: ["sector", "defensive"], riskBand: "low", price: 80.1, prevClose: 79.9,
    qualityHint: 81, valuationHint: 62, growthHint: 30, momentumHint: 44,
    themes: ["staples", "defensive"],
  },
  {
    ticker: "XLU", name: "Utilities Select Sector SPDR", type: "etf",
    sector: "Utilities", industry: "US Utilities", country: "United States", currency: "USD",
    tags: ["sector", "defensive", "income"], riskBand: "low", price: 78.5, prevClose: 78.2,
    qualityHint: 80, valuationHint: 60, growthHint: 34, momentumHint: 56,
    themes: ["utilities", "defensive", "power-demand"],
  },
  {
    ticker: "XLY", name: "Consumer Discretionary Select Sector SPDR", type: "etf",
    sector: "Consumer Discretionary", industry: "US Discretionary", country: "United States", currency: "USD",
    tags: ["sector", "growth"], riskBand: "medium", price: 208.9, prevClose: 206.3,
    qualityHint: 78, valuationHint: 46, growthHint: 62, momentumHint: 68,
    themes: ["discretionary", "consumer"],
    holdings: { AMZN: 0.23 },
  },
  {
    ticker: "ITA", name: "iShares U.S. Aerospace & Defense ETF", type: "etf",
    sector: "Industrials", industry: "Aerospace & Defense", country: "United States", currency: "USD",
    tags: ["sector"], riskBand: "medium", price: 152.7, prevClose: 150.4,
    qualityHint: 80, valuationHint: 50, growthHint: 56, momentumHint: 72,
    themes: ["defense", "aerospace", "geopolitics"],
  },
  {
    ticker: "PAVE", name: "Global X U.S. Infrastructure Development ETF", type: "etf",
    sector: "Industrials", industry: "Infrastructure", country: "United States", currency: "USD",
    tags: ["sector"], riskBand: "medium", price: 42.3, prevClose: 41.7,
    qualityHint: 77, valuationHint: 54, growthHint: 58, momentumHint: 66,
    themes: ["infrastructure", "reshoring", "industrials"],
  },

  // ---------- COMMODITY / TACTICAL ETFs ----------
  {
    ticker: "USO", name: "United States Oil Fund", type: "etf",
    sector: "Commodity", industry: "Crude Oil", country: "Global", currency: "USD",
    tags: ["commodity", "tactical"], riskBand: "high", price: 74.8, prevClose: 73.2,
    qualityHint: 55, valuationHint: 56, growthHint: 40, momentumHint: 54,
    themes: ["oil", "energy", "inflation-hedge"],
  },
  {
    ticker: "DBO", name: "Invesco DB Oil Fund", type: "etf",
    sector: "Commodity", industry: "Crude Oil", country: "Global", currency: "USD",
    tags: ["commodity", "tactical"], riskBand: "high", price: 14.2, prevClose: 13.9,
    qualityHint: 56, valuationHint: 58, growthHint: 40, momentumHint: 55,
    themes: ["oil", "energy", "inflation-hedge"],
  },
  {
    ticker: "GDX", name: "VanEck Gold Miners ETF", type: "etf",
    sector: "Materials", industry: "Gold Miners", country: "Global", currency: "USD",
    tags: ["commodity", "tactical"], riskBand: "high", price: 42.6, prevClose: 41.2,
    qualityHint: 62, valuationHint: 60, growthHint: 46, momentumHint: 78,
    themes: ["gold", "miners", "inflation-hedge"],
  },
  {
    ticker: "SLV", name: "iShares Silver Trust", type: "etf",
    sector: "Commodity", industry: "Precious Metals", country: "Global", currency: "USD",
    tags: ["commodity", "tactical"], riskBand: "high", price: 27.9, prevClose: 27.1,
    qualityHint: 60, valuationHint: 55, growthHint: 44, momentumHint: 76,
    themes: ["silver", "precious-metals", "inflation-hedge"],
  },
  {
    ticker: "GUSH", name: "Direxion Daily S&P Oil & Gas E&P Bull 2X", type: "etf",
    sector: "Energy", industry: "Leveraged Energy", country: "United States", currency: "USD",
    tags: ["tactical", "commodity"], riskBand: "high", leveraged: true, price: 38.1, prevClose: 36.4,
    qualityHint: 40, valuationHint: 45, growthHint: 40, momentumHint: 58,
    themes: ["oil", "leveraged", "energy"],
  },

  // ---------- STOCK WATCHLIST ----------
  {
    ticker: "TSM", name: "Taiwan Semiconductor Manufacturing", type: "stock",
    sector: "Technology", industry: "Semiconductor Foundry", country: "Taiwan", currency: "USD",
    tags: ["growth"], riskBand: "medium", price: 198.4, prevClose: 192.1,
    qualityHint: 92, valuationHint: 58, growthHint: 84, momentumHint: 82,
    themes: ["semiconductors", "ai", "foundry"],
    nextEvent: "Monthly sales report", nextEventDate: "2026-03-10",
  },
  {
    ticker: "AMD", name: "Advanced Micro Devices", type: "stock",
    sector: "Technology", industry: "Semiconductors", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "high", price: 172.6, prevClose: 168.3,
    qualityHint: 80, valuationHint: 36, growthHint: 82, momentumHint: 70,
    themes: ["semiconductors", "ai", "data-center"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-04-28",
  },
  {
    ticker: "NVDA", name: "NVIDIA Corporation", type: "stock",
    sector: "Technology", industry: "Semiconductors", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "high", price: 138.9, prevClose: 133.4,
    qualityHint: 94, valuationHint: 40, growthHint: 95, momentumHint: 90,
    themes: ["semiconductors", "ai", "data-center", "gpu"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-05-21",
  },
  {
    ticker: "INTC", name: "Intel Corporation", type: "stock",
    sector: "Technology", industry: "Semiconductors", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "high", price: 24.3, prevClose: 24.6,
    qualityHint: 52, valuationHint: 62, growthHint: 44, momentumHint: 38,
    themes: ["semiconductors", "foundry", "turnaround"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-04-24",
  },
  {
    ticker: "ASML", name: "ASML Holding N.V.", type: "stock",
    sector: "Technology", industry: "Semiconductor Equipment", country: "Netherlands", currency: "USD",
    tags: ["growth"], riskBand: "medium", price: 742.5, prevClose: 728.9,
    qualityHint: 93, valuationHint: 46, growthHint: 78, momentumHint: 72,
    themes: ["semiconductors", "equipment", "euv", "ai"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-04-16",
  },
  {
    ticker: "AVGO", name: "Broadcom Inc.", type: "stock",
    sector: "Technology", industry: "Semiconductors", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "medium", price: 178.2, prevClose: 173.6,
    qualityHint: 89, valuationHint: 42, growthHint: 80, momentumHint: 84,
    themes: ["semiconductors", "ai", "networking", "software"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-03-06",
  },
  {
    ticker: "AMAT", name: "Applied Materials", type: "stock",
    sector: "Technology", industry: "Semiconductor Equipment", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "medium", price: 182.4, prevClose: 178.1,
    qualityHint: 86, valuationHint: 52, growthHint: 72, momentumHint: 68,
    themes: ["semiconductors", "equipment"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-05-15",
  },
  {
    ticker: "LRCX", name: "Lam Research", type: "stock",
    sector: "Technology", industry: "Semiconductor Equipment", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "medium", price: 82.6, prevClose: 80.4,
    qualityHint: 85, valuationHint: 50, growthHint: 70, momentumHint: 69,
    themes: ["semiconductors", "equipment"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-04-22",
  },
  {
    ticker: "MU", name: "Micron Technology", type: "stock",
    sector: "Technology", industry: "Memory Semiconductors", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "high", price: 104.7, prevClose: 100.9,
    qualityHint: 74, valuationHint: 54, growthHint: 76, momentumHint: 72,
    themes: ["semiconductors", "memory", "ai", "hbm"],
    nextEvent: "Q2 earnings", nextEventDate: "2026-03-19",
  },
  {
    ticker: "GOOG", name: "Alphabet Inc. Class C", type: "stock",
    sector: "Communication Services", industry: "Internet & Media", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "medium", price: 176.3, prevClose: 173.1,
    qualityHint: 91, valuationHint: 56, growthHint: 72, momentumHint: 74,
    themes: ["internet", "ai", "cloud", "advertising"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-04-29",
  },
  {
    ticker: "MSFT", name: "Microsoft Corporation", type: "stock",
    sector: "Technology", industry: "Software & Cloud", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "medium", price: 428.9, prevClose: 423.2,
    qualityHint: 95, valuationHint: 44, growthHint: 74, momentumHint: 78,
    themes: ["software", "cloud", "ai", "data-center"],
    nextEvent: "Q3 earnings", nextEventDate: "2026-04-28",
  },
  {
    ticker: "AMZN", name: "Amazon.com Inc.", type: "stock",
    sector: "Consumer Discretionary", industry: "E-commerce & Cloud", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "medium", price: 218.4, prevClose: 214.6,
    qualityHint: 88, valuationHint: 46, growthHint: 76, momentumHint: 75,
    themes: ["e-commerce", "cloud", "ai", "logistics"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-04-30",
  },
  {
    ticker: "META", name: "Meta Platforms Inc.", type: "stock",
    sector: "Communication Services", industry: "Social & Advertising", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "medium", price: 612.8, prevClose: 601.3,
    qualityHint: 89, valuationHint: 50, growthHint: 78, momentumHint: 80,
    themes: ["social", "advertising", "ai", "vr"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-04-29",
  },
  {
    ticker: "AAPL", name: "Apple Inc.", type: "stock",
    sector: "Technology", industry: "Consumer Electronics", country: "United States", currency: "USD",
    tags: ["growth"], riskBand: "low", price: 232.1, prevClose: 230.4,
    qualityHint: 93, valuationHint: 42, growthHint: 58, momentumHint: 66,
    themes: ["consumer-electronics", "services", "ai"],
    nextEvent: "Q2 earnings", nextEventDate: "2026-05-01",
  },
  {
    ticker: "JPM", name: "JPMorgan Chase & Co.", type: "stock",
    sector: "Financials", industry: "Diversified Banks", country: "United States", currency: "USD",
    tags: ["income"], riskBand: "medium", price: 246.7, prevClose: 244.1,
    qualityHint: 87, valuationHint: 58, growthHint: 46, momentumHint: 70,
    themes: ["banks", "financials", "rates"],
    nextEvent: "Q1 earnings", nextEventDate: "2026-04-11",
  },
  {
    ticker: "BRK.B", name: "Berkshire Hathaway Inc. Class B", type: "stock",
    sector: "Financials", industry: "Diversified Holdings", country: "United States", currency: "USD",
    tags: ["defensive"], riskBand: "low", price: 468.2, prevClose: 465.9,
    qualityHint: 90, valuationHint: 60, growthHint: 44, momentumHint: 64,
    themes: ["conglomerate", "insurance", "value"],
  },
]

export const UNIVERSE: Record<string, Instrument> = Object.fromEntries(
  list.map((i) => [i.ticker, i]),
)

export const UNIVERSE_LIST = list

export function getInstrument(ticker: string): Instrument | undefined {
  return UNIVERSE[ticker.toUpperCase().trim()]
}

// Tickers included in the default daily scan (excludes leveraged products).
export const SCAN_UNIVERSE = list
  .filter((i) => !i.leveraged)
  .map((i) => i.ticker)

export const LEVERAGED_UNIVERSE = list.filter((i) => i.leveraged).map((i) => i.ticker)
