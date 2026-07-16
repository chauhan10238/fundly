"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { buildPortfolio, type PortfolioSummary } from "@/lib/dios/portfolio-engine"
import { getInstrument } from "@/lib/dios/universe"
import { DEFAULT_SETTINGS } from "@/lib/dios/macro"
import { SEED_CASH, SEED_HOLDINGS, SEED_RECOMMENDATIONS, SEED_TRANSACTIONS } from "@/lib/dios/seed"
import type { Holding, RecommendationRecord, Settings, Transaction } from "@/lib/dios/types"

interface StoreValue {
  holdings: Holding[]
  cash: number
  transactions: Transaction[]
  settings: Settings
  recommendations: RecommendationRecord[]
  portfolio: PortfolioSummary
  // portfolio mutations
  upsertHolding: (h: Holding) => void
  removeHolding: (ticker: string) => void
  addCash: (amount: number) => void
  withdrawCash: (amount: number) => void
  // transactions
  addTransaction: (t: Omit<Transaction, "id">) => void
  addTransactions: (t: Omit<Transaction, "id">[]) => number
  removeTransaction: (id: string) => void
  // settings
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
  // recommendations
  addRecommendation: (r: RecommendationRecord) => void
}

const StoreContext = createContext<StoreValue | null>(null)

let idCounter = 1000
const nextId = () => `t${++idCounter}`

// Apply a buy/sell transaction to holdings using weighted-average cost.
function applyTradeToHoldings(holdings: Holding[], t: Omit<Transaction, "id">): Holding[] {
  if (t.type !== "Buy" && t.type !== "Sell") return holdings
  const next = holdings.map((h) => ({ ...h }))
  const idx = next.findIndex((h) => h.ticker === t.ticker)
  const fees = (t.brokerageFee ?? 0) + (t.fxFee ?? 0)
  if (t.type === "Buy") {
    if (idx === -1) {
      next.push({ ticker: t.ticker, quantity: t.quantity, avgCost: t.price + fees / Math.max(t.quantity, 1) })
    } else {
      const h = next[idx]
      const newQty = h.quantity + t.quantity
      h.avgCost = newQty ? (h.avgCost * h.quantity + t.price * t.quantity + fees) / newQty : 0
      h.quantity = newQty
    }
  } else if (idx !== -1) {
    next[idx].quantity = Math.max(0, next[idx].quantity - t.quantity)
    if (next[idx].quantity === 0) next.splice(idx, 1)
  }
  return next
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

export function DiosProvider({ children }: { children: React.ReactNode }) {
  const [holdings, setHoldings] = useState<Holding[]>(SEED_HOLDINGS)
  const [cash, setCash] = useState<number>(SEED_CASH)
  const [transactions, setTransactions] = useState<Transaction[]>(SEED_TRANSACTIONS)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>(SEED_RECOMMENDATIONS)

  const portfolio = useMemo(
    () => buildPortfolio(holdings, cash, settings),
    [holdings, cash, settings],
  )

  const upsertHolding = useCallback((h: Holding) => {
    setHoldings((prev) => {
      const idx = prev.findIndex((x) => x.ticker === h.ticker)
      if (idx === -1) return [...prev, h]
      const next = [...prev]
      next[idx] = h
      return next
    })
  }, [])

  const removeHolding = useCallback((ticker: string) => {
    setHoldings((prev) => prev.filter((h) => h.ticker !== ticker))
  }, [])

  const addCash = useCallback((amount: number) => setCash((c) => c + amount), [])
  const withdrawCash = useCallback((amount: number) => setCash((c) => Math.max(0, c - amount)), [])

  const addTransaction = useCallback((t: Omit<Transaction, "id">) => {
    setTransactions((prev) => [{ ...t, id: nextId() }, ...prev])
    if (getInstrument(t.ticker) || t.type === "Buy" || t.type === "Sell") {
      setHoldings((prev) => applyTradeToHoldings(prev, t))
    }
    setCash((c) => c + cashDelta(t))
  }, [])

  const addTransactions = useCallback((batch: Omit<Transaction, "id">[]) => {
    let applied = 0
    setTransactions((prev) => {
      const created = batch.map((t) => ({ ...t, id: nextId() }))
      applied = created.length
      return [...created, ...prev]
    })
    setHoldings((prev) => batch.reduce((acc, t) => applyTradeToHoldings(acc, t), prev))
    setCash((c) => batch.reduce((acc, t) => acc + cashDelta(t), c))
    return applied
  }, [])

  const removeTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch, weights: { ...prev.weights, ...(patch.weights ?? {}) } }))
  }, [])

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  const addRecommendation = useCallback((r: RecommendationRecord) => {
    setRecommendations((prev) => [r, ...prev])
  }, [])

  const value: StoreValue = {
    holdings, cash, transactions, settings, recommendations, portfolio,
    upsertHolding, removeHolding, addCash, withdrawCash,
    addTransaction, addTransactions, removeTransaction,
    updateSettings, resetSettings, addRecommendation,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useDios() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useDios must be used within DiosProvider")
  return ctx
}
