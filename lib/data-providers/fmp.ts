import type { NormalizedFundamentals } from "./normalized-types"
import type { EarningsEvent, ProviderResult, VerifiedQuote } from "./types"

const PROVIDER = "Financial Modeling Prep" as const
const BASE = "https://financialmodelingprep.com/stable"

type CachedResponse = { expiresAt: number; value: { payload: unknown; sourceUrl: string } }

type FmpRuntimeState = {
  requestCache: Map<string, CachedResponse>
  inFlight: Map<string, Promise<{ payload: unknown; sourceUrl: string }>>
  activeRequests: number
  waiters: Array<() => void>
  callTimestamps: number[]
}

const globalForFmp = globalThis as typeof globalThis & { __fundlyFmpState?: FmpRuntimeState }
const state: FmpRuntimeState = globalForFmp.__fundlyFmpState ?? {
  requestCache: new Map(),
  inFlight: new Map(),
  activeRequests: 0,
  waiters: [],
  callTimestamps: [],
}
globalForFmp.__fundlyFmpState = state

const MAX_FMP_CONCURRENCY = 2
// Keep substantial headroom under the Starter-plan 300 calls/minute ceiling.
const MAX_FMP_CALLS_PER_MINUTE = 190

async function acquireFmpSlot() {
  if (state.activeRequests < MAX_FMP_CONCURRENCY) { state.activeRequests += 1; return }
  await new Promise<void>((resolve) => state.waiters.push(resolve))
  state.activeRequests += 1
}

function releaseFmpSlot() {
  state.activeRequests = Math.max(0, state.activeRequests - 1)
  state.waiters.shift()?.()
}

function cacheTtl(path: string) {
  // Requested Fundly policy: live quotes 30s, ticker search 5m.
  if (path === "quote" || path === "batch-quote") return 30_000
  if (path.includes("search")) return 5 * 60_000
  if (path.includes("historical")) return 6 * 60 * 60_000
  if (path === "profile") return 24 * 60 * 60_000
  if (path.includes("news")) return 10 * 60_000
  if (path.includes("analyst") || path.includes("rating") || path.includes("estimate")) return 60 * 60_000
  if (path.includes("earnings")) return 60 * 60_000
  if (path.includes("etf") || path.includes("institutional") || path.includes("holder") || path.includes("ownership")) return 6 * 60 * 60_000
  if (path.includes("statement") || path.includes("ratios") || path.includes("metrics")) return 6 * 60 * 60_000
  return 60 * 60_000
}

function pruneRuntimeCache(now = Date.now()) {
  // Prevent a long-lived Vercel worker from accumulating stale entries forever.
  if (state.requestCache.size < 1500) return
  for (const [key, entry] of state.requestCache) {
    if (entry.expiresAt <= now) state.requestCache.delete(key)
  }
}

function reserveRateBudget() {
  const now = Date.now()
  state.callTimestamps = state.callTimestamps.filter((stamp) => now - stamp < 60_000)
  if (state.callTimestamps.length >= MAX_FMP_CALLS_PER_MINUTE) {
    throw new Error("FMP internal rate guard active; using cached/fallback data")
  }
  state.callTimestamps.push(now)
}

export function getFmpApiKey() {
  return (
    process.env.FMP_API_KEY ||
    process.env.FMP_KEY ||
    process.env.FINANCIAL_MODELING_PREP_API_KEY ||
    process.env.FINANCIALMODELINGPREP_API_KEY ||
    ""
  ).trim()
}

function apiKey() {
  return getFmpApiKey()
}

function cleanSymbol(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

function number(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function first(payload: unknown): Record<string, any> | null {
  if (Array.isArray(payload)) return (payload[0] as Record<string, any>) ?? null
  if (payload && typeof payload === "object") return payload as Record<string, any>
  return null
}

async function request(path: string, params: Record<string, string>) {
  const key = apiKey()
  if (!key) throw new Error("FMP_API_KEY is not configured")
  const url = new URL(`${BASE}/${path}`)
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value))
  url.searchParams.set("apikey", key)
  const cacheKey = `${path}?${new URLSearchParams(params).toString()}`
  pruneRuntimeCache()
  const cached = state.requestCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  const existing = state.inFlight.get(cacheKey)
  if (existing) return existing

  const task = (async () => {
    await acquireFmpSlot()
    try {
      let lastError: unknown
      for (let attempt = 0; attempt < 2; attempt += 1) {
        reserveRateBudget()
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10_000)
        try {
          const response = await fetch(url, {
            cache: "force-cache",
            next: { revalidate: Math.max(1, Math.floor(cacheTtl(path) / 1000)) },
            signal: controller.signal,
            headers: { Accept: "application/json", "User-Agent": "Fundly/2.0" },
          })
          const raw = await response.text()
          let payload: unknown
          try { payload = JSON.parse(raw) } catch { throw new Error(`FMP returned non-JSON (${response.status})`) }
          if (response.status === 429 && attempt === 0) {
            const retryAfter = Number(response.headers.get("retry-after") ?? "0")
            await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2_000))
            continue
          }
          if (!response.ok) throw new Error(`FMP request failed (${response.status})`)
          if (payload && typeof payload === "object" && !Array.isArray(payload) && "Error Message" in payload) {
            throw new Error(String((payload as Record<string, unknown>)["Error Message"]))
          }
          const value = { payload, sourceUrl: url.toString().replace(key, "REDACTED") }
          state.requestCache.set(cacheKey, { expiresAt: Date.now() + cacheTtl(path), value })
          return value
        } catch (error) {
          lastError = error
        } finally {
          clearTimeout(timeout)
        }
      }
      throw lastError instanceof Error ? lastError : new Error("FMP request failed")
    } finally {
      releaseFmpSlot()
      state.inFlight.delete(cacheKey)
    }
  })()
  state.inFlight.set(cacheKey, task)
  return task
}

function failure<T>(error: unknown, sourceUrl?: string): ProviderResult<T> {
  return {
    ok: false,
    provider: PROVIDER,
    error: error instanceof Error ? error.message : "FMP request failed",
    retrievedAt: new Date().toISOString(),
    sourceUrl,
  }
}

export async function getFmpQuote(symbolInput: string): Promise<ProviderResult<VerifiedQuote>> {
  const symbol = cleanSymbol(symbolInput)
  const sourceUrl = `${BASE}/quote?symbol=${encodeURIComponent(symbol)}`
  try {
    const { payload } = await request("quote", { symbol })
    const row = first(payload)
    const price = number(row?.price)
    if (!row || !price || price <= 0) throw new Error("No FMP quote returned")
    const previousClose = number(row.previousClose) ?? (number(row.change) !== undefined ? price - Number(row.change) : undefined)
    return {
      ok: true,
      provider: PROVIDER,
      retrievedAt: new Date().toISOString(),
      sourceUrl,
      data: {
        symbol,
        price,
        previousClose,
        change: number(row.change),
        changePercent: number(row.changesPercentage ?? row.changePercentage),
        latestTradingDay: row.timestamp ? new Date(Number(row.timestamp) * 1000).toISOString().slice(0, 10) : undefined,
        name: row.name ? String(row.name) : undefined,
        currency: row.currency ? String(row.currency) : undefined,
        exchange: row.exchange ? String(row.exchange) : undefined,
        assetType: String(row.type ?? row.assetType ?? "").toLowerCase().includes("etf") ? "etf" : undefined,
      },
    }
  } catch (error) {
    return failure(error, sourceUrl)
  }
}

export async function getFmpFundamentals(symbolInput: string): Promise<ProviderResult<NormalizedFundamentals>> {
  const symbol = cleanSymbol(symbolInput)
  const sourceUrl = `${BASE}/income-statement-ttm?symbol=${encodeURIComponent(symbol)}`
  try {
    const [profileRes, incomeRes, balanceRes, cashRes, ratiosRes, metricsRes, annualIncomeRes] = await Promise.all([
      request("profile", { symbol }),
      request("income-statement-ttm", { symbol }),
      request("balance-sheet-statement-ttm", { symbol }),
      request("cash-flow-statement-ttm", { symbol }),
      request("ratios-ttm", { symbol }),
      request("key-metrics-ttm", { symbol }),
      request("income-statement", { symbol, period: "annual", limit: "2" }),
    ])

    const profile = first(profileRes.payload) ?? {}
    const income = first(incomeRes.payload) ?? {}
    const balance = first(balanceRes.payload) ?? {}
    const cashflow = first(cashRes.payload) ?? {}
    const ratios = first(ratiosRes.payload) ?? {}
    const metrics = first(metricsRes.payload) ?? {}
    const annual = Array.isArray(annualIncomeRes.payload) ? annualIncomeRes.payload as Record<string, any>[] : []
    const currentRevenue = number(annual[0]?.revenue)
    const priorRevenue = number(annual[1]?.revenue)
    const revenueGrowth = currentRevenue !== undefined && priorRevenue && priorRevenue !== 0
      ? { current: currentRevenue, previous: priorRevenue, changePercent: ((currentRevenue - priorRevenue) / Math.abs(priorRevenue)) * 100 }
      : undefined

    const revenue = number(income.revenue)
    const grossProfit = number(income.grossProfit)
    const operatingIncome = number(income.operatingIncome)
    const netIncome = number(income.netIncome)
    const operatingCashFlow = number(cashflow.operatingCashFlow ?? cashflow.netCashProvidedByOperatingActivities)
    const capex = number(cashflow.capitalExpenditure)
    const freeCashFlow = number(cashflow.freeCashFlow) ?? (operatingCashFlow !== undefined ? operatingCashFlow - Math.abs(capex ?? 0) : undefined)
    const equity = number(balance.totalStockholdersEquity ?? balance.totalEquity)
    const shares = number(income.weightedAverageShsOutDil ?? metrics.averageSharesOutstanding)

    const data: NormalizedFundamentals = {
      entityName: String(profile.companyName ?? profile.name ?? symbol),
      currency: String(profile.currency ?? income.reportedCurrency ?? "USD"),
      revenueTTM: revenue,
      revenueGrowth,
      grossProfitTTM: grossProfit,
      operatingIncomeTTM: operatingIncome,
      netIncomeTTM: netIncome,
      operatingCashFlowTTM: operatingCashFlow,
      capitalExpenditureTTM: capex,
      freeCashFlowTTM: freeCashFlow,
      cash: number(balance.cashAndCashEquivalents ?? balance.cashAndShortTermInvestments),
      totalDebt: number(balance.totalDebt),
      assets: number(balance.totalAssets),
      liabilities: number(balance.totalLiabilities),
      equity,
      sharesOutstanding: shares,
      epsDilutedTTM: number(income.epsDiluted ?? income.eps),
      bookValuePerShare: number(metrics.bookValuePerShare) ?? (equity !== undefined && shares ? equity / shares : undefined),
      grossMargin: number(ratios.grossProfitMargin) !== undefined ? Number(ratios.grossProfitMargin) * 100 : revenue && grossProfit !== undefined ? (grossProfit / revenue) * 100 : undefined,
      operatingMargin: number(ratios.operatingProfitMargin) !== undefined ? Number(ratios.operatingProfitMargin) * 100 : revenue && operatingIncome !== undefined ? (operatingIncome / revenue) * 100 : undefined,
      profitMargin: number(ratios.netProfitMargin) !== undefined ? Number(ratios.netProfitMargin) * 100 : revenue && netIncome !== undefined ? (netIncome / revenue) * 100 : undefined,
      freeCashFlowMargin: revenue && freeCashFlow !== undefined ? (freeCashFlow / revenue) * 100 : undefined,
      returnOnEquity: number(ratios.returnOnEquity) !== undefined ? Number(ratios.returnOnEquity) * 100 : number(metrics.returnOnEquity) !== undefined ? Number(metrics.returnOnEquity) * 100 : undefined,
      debtToEquity: number(ratios.debtEquityRatio ?? metrics.debtToEquity),
      currentRatio: number(ratios.currentRatio ?? metrics.currentRatio),
      sourcePeriod: String(income.period ?? "TTM"),
      latestFiled: String(income.fillingDate ?? income.date ?? new Date().toISOString().slice(0, 10)),
    }

    if (!data.revenueTTM && !data.netIncomeTTM && !data.assets) throw new Error("FMP returned no usable fundamentals")

    return { ok: true, provider: PROVIDER, data, retrievedAt: new Date().toISOString(), sourceUrl }
  } catch (error) {
    return failure(error, sourceUrl)
  }
}

export async function getFmpEarnings(symbolInput: string): Promise<ProviderResult<EarningsEvent[]>> {
  const symbol = cleanSymbol(symbolInput)
  const sourceUrl = `${BASE}/earnings-calendar?symbol=${encodeURIComponent(symbol)}`
  try {
    const now = new Date()
    const from = new Date(now.getTime() - 370 * 86_400_000).toISOString().slice(0, 10)
    const to = new Date(now.getTime() + 370 * 86_400_000).toISOString().slice(0, 10)
    const { payload } = await request("earnings-calendar", { from, to, symbol })
    const rows = Array.isArray(payload) ? payload : []
    const data: EarningsEvent[] = rows
      .filter((row: any) => String(row.symbol ?? "").toUpperCase() === symbol && row.date)
      .map((row: any) => ({
        symbol,
        date: String(row.date),
        hour: row.time ? String(row.time) : undefined,
        epsEstimate: number(row.epsEstimated ?? row.epsEstimate),
        epsActual: number(row.epsActual),
        revenueEstimate: number(row.revenueEstimated ?? row.revenueEstimate),
        revenueActual: number(row.revenueActual),
        quarter: number(row.quarter),
        year: number(row.fiscalDateEnding?.slice?.(0, 4) ?? row.year),
      }))
    return { ok: true, provider: PROVIDER, data, retrievedAt: new Date().toISOString(), sourceUrl }
  } catch (error) {
    return failure(error, sourceUrl)
  }
}

export async function getFmpBatchQuotes(symbolInputs: string[]): Promise<ProviderResult<VerifiedQuote[]>> {
  const symbols = Array.from(new Set(symbolInputs.map(cleanSymbol).filter(Boolean))).slice(0, 200)
  const sourceUrl = `${BASE}/batch-quote?symbols=${encodeURIComponent(symbols.join(","))}`
  if (!symbols.length) return { ok: true, provider: PROVIDER, data: [], retrievedAt: new Date().toISOString(), sourceUrl }
  try {
    const { payload } = await request("batch-quote", { symbols: symbols.join(",") })
    const rows = Array.isArray(payload) ? payload : []
    const data: VerifiedQuote[] = rows.flatMap((row: any) => {
      const symbol = cleanSymbol(String(row.symbol ?? ""))
      const price = number(row.price)
      if (!symbol || !price || price <= 0) return []
      const previousClose = number(row.previousClose) ?? (number(row.change) !== undefined ? price - Number(row.change) : undefined)
      return [{
        symbol, price, previousClose, change: number(row.change),
        changePercent: number(row.changesPercentage ?? row.changePercentage),
        latestTradingDay: row.timestamp ? new Date(Number(row.timestamp) * 1000).toISOString().slice(0, 10) : undefined,
      }]
    })
    return { ok: true, provider: PROVIDER, data, retrievedAt: new Date().toISOString(), sourceUrl }
  } catch (error) {
    return failure(error, sourceUrl)
  }
}

export interface FmpSymbolSearchResult {
  symbol: string
  name: string
  exchange: string
  type: "stock" | "etf"
  currency?: string
}

export async function searchFmpSymbols(queryInput: string): Promise<ProviderResult<FmpSymbolSearchResult[]>> {
  const query = queryInput.trim()
  const sourceUrl = `${BASE}/search-symbol?query=${encodeURIComponent(query)}`
  try {
    if (!query) {
      return { ok: true, provider: PROVIDER, data: [], retrievedAt: new Date().toISOString(), sourceUrl }
    }
    const { payload } = await request("search-symbol", { query, limit: "12" })
    const rows = Array.isArray(payload) ? payload : []
    const data = rows
      .map((row: any) => ({
        symbol: cleanSymbol(String(row.symbol ?? "")),
        name: String(row.name ?? row.companyName ?? row.symbol ?? ""),
        exchange: String(row.exchangeShortName ?? row.exchange ?? ""),
        type: String(row.type ?? row.assetType ?? "stock").toLowerCase().includes("etf") ? "etf" as const : "stock" as const,
        currency: row.currency ? String(row.currency) : undefined,
      }))
      .filter((row) => Boolean(row.symbol && row.name))
    return { ok: true, provider: PROVIDER, data, retrievedAt: new Date().toISOString(), sourceUrl }
  } catch (error) {
    return failure(error, sourceUrl)
  }
}
