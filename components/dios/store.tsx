"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { buildPortfolio, type LiveQuote, type LiveQuoteMap, type PortfolioSummary } from "@/lib/dios/portfolio-engine"
import { getInstrument } from "@/lib/dios/universe"
import { DEFAULT_SETTINGS } from "@/lib/dios/macro"
import { SEED_CASH, SEED_HOLDINGS, SEED_RECOMMENDATIONS, SEED_TRANSACTIONS } from "@/lib/dios/seed"
import type { Holding, RecommendationRecord, Settings, Transaction } from "@/lib/dios/types"

const STORAGE_KEY = "dios-portfolio-v1"
const MIN_POSITION_QTY = 0.001

interface PersistedStore {
  holdings: Holding[]
  cash: number
  transactions: Transaction[]
  settings: Settings
  recommendations: RecommendationRecord[]
}

type QuoteStatus = "idle" | "loading" | "live" | "partial" | "error"

interface StoreValue extends PersistedStore {
  portfolio: PortfolioSummary
  hydrated: boolean
  quoteStatus: QuoteStatus
  quoteError: string | null
  quotesRefreshedAt: string | null
  unavailableQuotes: string[]
  refreshQuotes: () => Promise<void>
  upsertHolding: (h: Holding) => void
  removeHolding: (ticker: string) => void
  addCash: (amount: number) => void
  withdrawCash: (amount: number) => void
  addTransaction: (t: Omit<Transaction, "id">) => void
  addTransactions: (t: Omit<Transaction, "id">[]) => number
  removeTransaction: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
  addRecommendation: (r: RecommendationRecord) => void
  resetPortfolio: () => void
}

const StoreContext = createContext<StoreValue | null>(null)
let idCounter = 1000
const nextId = () => `t${Date.now()}-${++idCounter}`

function normalizeHolding(h: Holding): Holding {
  const rawQuantity = Math.max(0, Number(h.quantity) || 0)
  return {
    ticker: h.ticker.trim().toUpperCase(),
    quantity: rawQuantity <= MIN_POSITION_QTY ? 0 : rawQuantity,
    avgCost: Math.max(0, Number(h.avgCost) || 0),
  }
}

function applyTradeToHoldings(holdings: Holding[], t: Omit<Transaction, "id">): Holding[] {
  if (t.type !== "Buy" && t.type !== "Sell") return holdings
  const ticker = t.ticker.trim().toUpperCase()
  const next = holdings.map((h) => ({ ...h }))
  const idx = next.findIndex((h) => h.ticker === ticker)
  if (t.type === "Buy") {
    if (idx === -1) {
      next.push({ ticker, quantity: t.quantity, avgCost: t.price })
    } else {
      const h = next[idx]
      const newQty = h.quantity + t.quantity
      h.avgCost = newQty
        ? (h.avgCost * h.quantity + t.price * t.quantity) / newQty
        : 0
      h.quantity = newQty
    }
  } else if (idx !== -1) {
    const heldQuantity = next[idx].quantity
    const remaining = heldQuantity - t.quantity
    const closeTolerance = Math.max(MIN_POSITION_QTY, heldQuantity * 0.001)

    if (remaining <= closeTolerance) next.splice(idx, 1)
    else next[idx].quantity = remaining
  }

  return next.sort((a, b) => a.ticker.localeCompare(b.ticker))
}

function cashDelta(t: Omit<Transaction, "id">): number {
  const fees = (t.brokerageFee ?? 0) + (t.fxFee ?? 0)
  switch (t.type) {
    case "Buy": return -(t.price * t.quantity + fees)
    case "Sell": return t.price * t.quantity - fees
    case "Dividend": return t.quantity * t.price - fees
    case "Deposit": return t.quantity * (t.price || 1) - fees
    case "Withdrawal": return -(t.quantity * (t.price || 1) + fees)
    case "Fee": return -(t.quantity || fees)
    default: return 0
  }
}

function initialState(): PersistedStore {
  return {
    holdings: SEED_HOLDINGS.map(normalizeHolding),
    cash: 0,
    transactions: SEED_TRANSACTIONS,
    settings: DEFAULT_SETTINGS,
    recommendations: SEED_RECOMMENDATIONS,
  }
}

export function DiosProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedStore>(initialState)
  const [hydrated, setHydrated] = useState(false)
  const [liveQuotes, setLiveQuotes] = useState<LiveQuoteMap>({})
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>("idle")
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quotesRefreshedAt, setQuotesRefreshedAt] = useState<string | null>(null)
  const [unavailableQuotes, setUnavailableQuotes] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedStore>
        setState((current) => ({
          holdings: Array.isArray(parsed.holdings) ? parsed.holdings.map(normalizeHolding).filter((h) => h.quantity > 0) : current.holdings,
          cash: 0,
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : current.transactions,
          settings: parsed.settings ? { ...current.settings, ...parsed.settings, weights: { ...current.settings.weights, ...parsed.settings.weights } } : current.settings,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : current.recommendations,
        }))
      }
    } catch {
      // Corrupt local storage should never block the app; fall back to seed data.
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const refreshQuotes = useCallback(async () => {
    const symbols = Array.from(new Set(state.holdings.map((h) => h.ticker.trim().toUpperCase()).filter(Boolean)))
    if (symbols.length === 0) {
      setLiveQuotes({})
      setQuoteStatus("idle")
      setQuoteError(null)
      setQuotesRefreshedAt(null)
      setUnavailableQuotes([])
      return
    }

    setQuoteStatus("loading")
    setQuoteError(null)

    try {
      const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`, {
        cache: "no-store",
      })
      const payload = await response.json() as {
        quotes?: LiveQuote[]
        unavailable?: string[]
        refreshedAt?: string
        error?: string
      }

      if (!response.ok || !Array.isArray(payload.quotes)) {
        throw new Error(payload.error || `Quote request failed with status ${response.status}`)
      }

      const nextQuotes = Object.fromEntries(payload.quotes.map((quote) => [quote.symbol, quote]))
      const unavailable = Array.isArray(payload.unavailable) ? payload.unavailable : []

      setLiveQuotes((current) => ({ ...current, ...nextQuotes }))
      setUnavailableQuotes(unavailable)
      setQuotesRefreshedAt(payload.refreshedAt ?? new Date().toISOString())
      setQuoteStatus(unavailable.length > 0 ? "partial" : "live")
    } catch (error) {
      setQuoteStatus("error")
      setQuoteError(error instanceof Error ? error.message : "Unable to retrieve live prices")
    }
  }, [state.holdings])

  useEffect(() => {
    if (!hydrated) return
    void refreshQuotes()

    const refresh = () => {
      if (document.visibilityState === "visible") void refreshQuotes()
    }
    const interval = window.setInterval(refresh, 10_000)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [hydrated, refreshQuotes])

  const portfolio = useMemo(
    () => buildPortfolio(state.holdings, 0, state.settings, liveQuotes),
    [state.holdings, state.settings, liveQuotes],
  )

  const upsertHolding = useCallback((holding: Holding) => {
    const h = normalizeHolding(holding)
    setState((prev) => {
      const idx = prev.holdings.findIndex((x) => x.ticker === h.ticker)
      const holdings = [...prev.holdings]
      if (idx === -1) holdings.push(h)
      else holdings[idx] = h
      return { ...prev, holdings: holdings.filter((x) => x.quantity > 0).sort((a, b) => a.ticker.localeCompare(b.ticker)) }
    })
  }, [])

  const removeHolding = useCallback((ticker: string) => {
    setState((prev) => ({ ...prev, holdings: prev.holdings.filter((h) => h.ticker !== ticker.trim().toUpperCase()) }))
  }, [])

  const addCash = useCallback((_amount: number) => setState((prev) => ({ ...prev, cash: 0 })), [])
  const withdrawCash = useCallback((_amount: number) => setState((prev) => ({ ...prev, cash: 0 })), [])

  const addTransaction = useCallback((transaction: Omit<Transaction, "id">) => {
    const t = { ...transaction, ticker: transaction.ticker.trim().toUpperCase() }
    setState((prev) => ({
      ...prev,
      transactions: [{ ...t, id: nextId() }, ...prev.transactions],
      holdings: (getInstrument(t.ticker) || t.type === "Buy" || t.type === "Sell")
        ? applyTradeToHoldings(prev.holdings, t)
        : prev.holdings,
      cash: 0,
    }))
  }, [])

  const addTransactions = useCallback((batch: Omit<Transaction, "id">[]) => {
    const normalized = batch.map((t) => ({ ...t, ticker: t.ticker.trim().toUpperCase() }))
    setState((prev) => ({
      ...prev,
      transactions: [...normalized.map((t) => ({ ...t, id: nextId() })), ...prev.transactions],
      holdings: normalized.reduce((acc, t) => applyTradeToHoldings(acc, t), prev.holdings),
      cash: 0,
    }))
    return normalized.length
  }, [])

  const removeTransaction = useCallback((id: string) => {
    setState((prev) => ({ ...prev, transactions: prev.transactions.filter((t) => t.id !== id) }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch, weights: { ...prev.settings.weights, ...(patch.weights ?? {}) } },
    }))
  }, [])

  const resetSettings = useCallback(() => setState((prev) => ({ ...prev, settings: DEFAULT_SETTINGS })), [])
  const addRecommendation = useCallback((r: RecommendationRecord) => setState((prev) => ({ ...prev, recommendations: [r, ...prev.recommendations] })), [])
  const resetPortfolio = useCallback(() => setState(initialState()), [])

  return (
    <StoreContext.Provider value={{
      ...state, portfolio, hydrated, quoteStatus, quoteError, quotesRefreshedAt,
      unavailableQuotes, refreshQuotes, upsertHolding, removeHolding, addCash, withdrawCash,
      addTransaction, addTransactions, removeTransaction, updateSettings, resetSettings,
      addRecommendation, resetPortfolio,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useDios() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useDios must be used within DiosProvider")
  return ctx
}
