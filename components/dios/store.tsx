"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { buildPortfolio, type LiveQuote, type LiveQuoteMap, type PortfolioSummary } from "@/lib/dios/portfolio-engine"
import { getInstrument } from "@/lib/dios/universe"
import { DEFAULT_SETTINGS } from "@/lib/dios/macro"
import { SEED_HOLDINGS, SEED_RECOMMENDATIONS, SEED_TRANSACTIONS } from "@/lib/dios/seed"
import { useProfile } from "@/components/dios/profile-provider"
import {
  HOLDING_BASELINE_VERSION,
  SUREN_TRACKING_START_DATE,
  baselineNeedsMeasurement,
  defaultSurenTracking,
  trackedRecommendationsForProfile,
} from "@/lib/dios/tracking"
import type {
  ExistingHoldingBaseline,
  Holding,
  InvestmentJournalEntry,
  RecommendationRecord,
  Settings,
  TrackingMetadata,
  Transaction,
} from "@/lib/dios/types"

const MIN_POSITION_QTY = 0.001

interface PersistedStore {
  holdings: Holding[]
  cash: number
  transactions: Transaction[]
  settings: Settings
  recommendations: RecommendationRecord[]
  journal: InvestmentJournalEntry[]
  holdingBaselines: ExistingHoldingBaseline[]
  tracking: TrackingMetadata | null
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
  refreshHoldingBaselines: () => Promise<void>
  refreshBaselineMeasurements: () => Promise<void>
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
  updateRecommendation: (id: string, patch: Partial<RecommendationRecord>) => void
  upsertJournalEntry: (entry: InvestmentJournalEntry) => void
  removeJournalEntry: (ticker: string) => void
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
    instrument: h.instrument,
  }
}

function applyTradeToHoldings(holdings: Holding[], t: Omit<Transaction, "id">): Holding[] {
  if (t.type !== "Buy" && t.type !== "Sell") return holdings
  const ticker = t.ticker.trim().toUpperCase()
  const next = holdings.map((h) => ({ ...h }))
  const idx = next.findIndex((h) => h.ticker === ticker)
  const fees = (t.brokerageFee ?? 0) + (t.fxFee ?? 0)

  if (t.type === "Buy") {
    if (idx === -1) {
      next.push({
        ticker,
        quantity: t.quantity,
        avgCost: t.price + fees / Math.max(t.quantity, 1),
      })
    } else {
      const h = next[idx]
      const newQty = h.quantity + t.quantity
      h.avgCost = newQty
        ? (h.avgCost * h.quantity + t.price * t.quantity + fees) / newQty
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

function buildHoldingsAsOf(
  currentHoldings: Holding[],
  transactions: Transaction[],
  date: string,
) {
  const instrumentByTicker = new Map(
    currentHoldings.map((holding) => [holding.ticker, holding.instrument]),
  )
  const eligible = transactions
    .filter((transaction) =>
      (transaction.type === "Buy" || transaction.type === "Sell") &&
      transaction.date.slice(0, 10) <= date,
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const reconstructed = eligible.reduce(
    (holdings, transaction) => applyTradeToHoldings(holdings, transaction),
    [] as Holding[],
  )

  if (!reconstructed.length) return currentHoldings.map(normalizeHolding)
  return reconstructed.map((holding) => ({
    ...holding,
    instrument: instrumentByTicker.get(holding.ticker),
  }))
}

function initialState(): PersistedStore {
  return {
    holdings: SEED_HOLDINGS.map(normalizeHolding),
    cash: 0,
    transactions: SEED_TRANSACTIONS,
    settings: DEFAULT_SETTINGS,
    recommendations: SEED_RECOMMENDATIONS,
    journal: [],
    holdingBaselines: [],
    tracking: null,
  }
}

export function DiosProvider({ children }: { children: React.ReactNode }) {
  const { activeProfile } = useProfile()
  const [state, setState] = useState<PersistedStore>(initialState)
  const [hydrated, setHydrated] = useState(false)
  const [liveQuotes, setLiveQuotes] = useState<LiveQuoteMap>({})
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>("idle")
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quotesRefreshedAt, setQuotesRefreshedAt] = useState<string | null>(null)
  const [unavailableQuotes, setUnavailableQuotes] = useState<string[]>([])
  const stateRef = useRef(state)
  const cloudReadyRef = useRef(false)
  const remoteShaRef = useRef<string | null>(null)
  const suppressNextSaveRef = useRef(false)
  const localChangesPendingRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRequestRef = useRef<AbortController | null>(null)
  const baselineBuildRef = useRef(false)
  const baselineMeasureRef = useRef(false)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const applyRemoteState = useCallback((
    remote: Partial<PersistedStore>,
    profileId: "deepak" | "suren",
  ) => {
    const remoteRecommendations = Array.isArray(remote.recommendations)
      ? remote.recommendations
      : []
    const eligibleRecommendations = trackedRecommendationsForProfile(
      profileId,
      remoteRecommendations,
    )
    const recommendationsChanged = eligibleRecommendations.length !== remoteRecommendations.length

    const remoteBaselines = Array.isArray(remote.holdingBaselines)
      ? remote.holdingBaselines
      : []
    const tracking = profileId === "suren"
      ? {
          ...(remote.tracking ?? {}),
          ...defaultSurenTracking(),
          baselineStatus: remote.tracking?.baselineStatus ?? "pending",
          baselineBuiltAt: remote.tracking?.baselineBuiltAt,
          baselineMeasuredAt: remote.tracking?.baselineMeasuredAt,
          baselineError: remote.tracking?.baselineError,
        }
      : remote.tracking ?? null
    const trackingChanged = profileId === "suren" && (
      !remote.tracking ||
      remote.tracking.startDate !== SUREN_TRACKING_START_DATE ||
      remote.tracking.baselineVersion !== HOLDING_BASELINE_VERSION
    )
    const migrationChanged = recommendationsChanged || trackingChanged || (
      profileId === "suren" && !Array.isArray(remote.holdingBaselines)
    )

    suppressNextSaveRef.current = !migrationChanged
    localChangesPendingRef.current = migrationChanged
    setState((current) => ({
      holdings: Array.isArray(remote.holdings)
        ? remote.holdings.map(normalizeHolding).filter((holding) => holding.quantity > 0)
        : current.holdings,
      cash: Number(remote.cash) || 0,
      transactions: Array.isArray(remote.transactions) ? remote.transactions : current.transactions,
      settings: remote.settings
        ? {
            ...current.settings,
            ...remote.settings,
            weights: {
              ...current.settings.weights,
              ...remote.settings.weights,
            },
          }
        : current.settings,
      recommendations: profileId === "suren"
        ? eligibleRecommendations
        : (Array.isArray(remote.recommendations) ? remote.recommendations : current.recommendations),
      journal: Array.isArray(remote.journal) ? remote.journal : current.journal,
      holdingBaselines: remoteBaselines,
      tracking,
    }))
  }, [])

  const loadRemoteStore = useCallback(async (silent = false) => {
    // Do not let a stale cloud read overwrite a trade that is waiting to be saved.
    if (silent && localChangesPendingRef.current) return

    try {
      const response = await fetch(`/api/store?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      })

      const payload = await response.json() as {
        data?: Partial<PersistedStore> | null
        sha?: string | null
        error?: string
        profileId?: "deepak" | "suren"
      }

      if (!response.ok) {
        throw new Error(payload.error || `Store request failed with status ${response.status}`)
      }

      remoteShaRef.current = payload.sha ?? null
      if (payload.data && payload.profileId) applyRemoteState(payload.data, payload.profileId)

      // Saving is enabled only after a successful cloud read.
      cloudReadyRef.current = true
    } catch (error) {
      cloudReadyRef.current = false
      if (!silent) console.error("Unable to load the DIOS portfolio from GitHub:", error)
    } finally {
      setHydrated(true)
    }
  }, [applyRemoteState])

  useEffect(() => {
    void loadRemoteStore()
  }, [loadRemoteStore])

  useEffect(() => {
    if (!hydrated || !cloudReadyRef.current) return

    // A cloud refresh updates React state. Do not write that same state back.
    if (suppressNextSaveRef.current) {
      suppressNextSaveRef.current = false
      return
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      saveRequestRef.current?.abort()
      const controller = new AbortController()
      saveRequestRef.current = controller

      try {
        const response = await fetch("/api/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: stateRef.current,
            baseSha: remoteShaRef.current,
          }),
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => null) as {
          error?: string
          conflict?: boolean
          sha?: string | null
          data?: Partial<PersistedStore>
        } | null

        if (response.status === 409 && payload?.conflict) {
          // Keep the user's local import and retry against the newest cloud SHA.
          remoteShaRef.current = payload.sha ?? null
          const retry = await fetch("/api/store", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: stateRef.current,
              baseSha: remoteShaRef.current,
            }),
            signal: controller.signal,
          })
          const retryPayload = await retry.json().catch(() => null) as {
            error?: string
            sha?: string | null
          } | null
          if (!retry.ok) {
            throw new Error(retryPayload?.error || `Store retry failed with status ${retry.status}`)
          }
          remoteShaRef.current = retryPayload?.sha ?? remoteShaRef.current
          localChangesPendingRef.current = false
          return
        }

        if (!response.ok) {
          throw new Error(payload?.error || `Store save failed with status ${response.status}`)
        }

        remoteShaRef.current = payload?.sha ?? remoteShaRef.current
        localChangesPendingRef.current = false
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to save the DIOS portfolio to GitHub:", error)
        }
      }
    }, 350)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state, hydrated, applyRemoteState])

  useEffect(() => {
    if (!hydrated) return

    const refreshFromRemote = () => {
      if (document.visibilityState === "visible") void loadRemoteStore(true)
    }

    window.addEventListener("focus", refreshFromRemote)
    document.addEventListener("visibilitychange", refreshFromRemote)

    return () => {
      window.removeEventListener("focus", refreshFromRemote)
      document.removeEventListener("visibilitychange", refreshFromRemote)
    }
  }, [hydrated, loadRemoteStore])

  useEffect(() => {
    baselineBuildRef.current = false
    baselineMeasureRef.current = false
  }, [activeProfile?.id])

  const refreshHoldingBaselines = useCallback(async () => {
    if (activeProfile?.id !== "suren" || baselineBuildRef.current) return

    const snapshot = stateRef.current
    const capturedHoldings = snapshot.tracking?.baselineHoldings?.length
      ? snapshot.tracking.baselineHoldings
      : buildHoldingsAsOf(snapshot.holdings, snapshot.transactions, SUREN_TRACKING_START_DATE)
    const capturedTickers = snapshot.tracking?.baselineTickers?.length
      ? snapshot.tracking.baselineTickers
      : capturedHoldings.map((holding) => holding.ticker)
    const holdingMap = new Map(capturedHoldings.map((holding) => [holding.ticker, holding]))
    const existingTickers = new Set(snapshot.holdingBaselines.map((item) => item.ticker))
    const missing = capturedTickers
      .filter((ticker) => !existingTickers.has(ticker))
      .map((ticker) => holdingMap.get(ticker))
      .filter((holding): holding is Holding => Boolean(holding))

    if (!missing.length) {
      if (snapshot.tracking?.baselineStatus !== "complete") {
        localChangesPendingRef.current = true
        setState((current) => ({
          ...current,
          tracking: {
            ...defaultSurenTracking(),
            ...(current.tracking ?? {}),
            baselineTickers: capturedTickers,
            baselineHoldings: capturedHoldings,
            baselineStatus: "complete",
            baselineBuiltAt: current.tracking?.baselineBuiltAt ?? new Date().toISOString(),
            baselineError: undefined,
          },
        }))
      }
      return
    }

    baselineBuildRef.current = true
    localChangesPendingRef.current = true
    setState((current) => ({
      ...current,
      tracking: {
        ...defaultSurenTracking(),
        ...(current.tracking ?? {}),
        baselineTickers: capturedTickers,
        baselineHoldings: capturedHoldings,
        baselineStatus: "building",
        baselineError: undefined,
      },
    }))

    const created: ExistingHoldingBaseline[] = []
    const errors: string[] = []

    try {
      for (let index = 0; index < missing.length; index += 8) {
        const chunk = missing.slice(index, index + 8)
        const response = await fetch("/api/tracking/baselines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: SUREN_TRACKING_START_DATE,
            holdings: chunk.map(({ ticker, quantity, avgCost }) => ({
              ticker, quantity, avgCost,
            })),
          }),
        })
        const payload = await response.json().catch(() => null) as {
          error?: string
          results?: Array<{
            ticker?: string
            baseline?: ExistingHoldingBaseline
            error?: string
          }>
        } | null
        if (!response.ok) {
          throw new Error(payload?.error || `Baseline request failed with status ${response.status}`)
        }
        for (const row of payload?.results ?? []) {
          if (row.baseline) created.push(row.baseline)
          else if (row.error) errors.push(`${row.ticker || "Unknown"}: ${row.error}`)
        }
      }

      localChangesPendingRef.current = true
      setState((current) => {
        const byTicker = new Map(current.holdingBaselines.map((item) => [item.ticker, item]))
        for (const item of created) byTicker.set(item.ticker, item)
        const expected = new Set(capturedTickers)
        const complete = Array.from(expected).every((ticker) => byTicker.has(ticker))
        return {
          ...current,
          holdingBaselines: Array.from(byTicker.values()).sort((a, b) => a.ticker.localeCompare(b.ticker)),
          tracking: {
            ...defaultSurenTracking(),
            ...(current.tracking ?? {}),
            baselineTickers: capturedTickers,
            baselineHoldings: capturedHoldings,
            baselineStatus: complete ? "complete" : "partial",
            baselineBuiltAt: new Date().toISOString(),
            baselineError: errors.length ? errors.slice(0, 8).join(" ") : undefined,
          },
        }
      })
    } catch (error) {
      localChangesPendingRef.current = true
      setState((current) => ({
        ...current,
        tracking: {
          ...defaultSurenTracking(),
          ...(current.tracking ?? {}),
          baselineStatus: "partial",
          baselineError: error instanceof Error ? error.message : "Unable to build holding baselines.",
        },
      }))
    } finally {
      baselineBuildRef.current = false
    }
  }, [activeProfile?.id])

  const refreshBaselineMeasurements = useCallback(async () => {
    if (activeProfile?.id !== "suren" || baselineMeasureRef.current) return
    const due = stateRef.current.holdingBaselines.filter((baseline) => baselineNeedsMeasurement(baseline))
    if (!due.length) return

    baselineMeasureRef.current = true
    try {
      const updates = new Map<string, Partial<ExistingHoldingBaseline>>()
      for (let index = 0; index < due.length; index += 8) {
        const response = await fetch("/api/tracking/measure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baselines: due.slice(index, index + 8) }),
        })
        const payload = await response.json().catch(() => null) as {
          error?: string
          results?: Array<({
            id: string
            benchmarkPrice: number | null
            outcomes: ExistingHoldingBaseline["outcomes"]
            benchmarkOutcomes: ExistingHoldingBaseline["benchmarkOutcomes"]
            measurements: ExistingHoldingBaseline["measurements"]
          } | { id: string; error: string })>
        } | null
        if (!response.ok) {
          throw new Error(payload?.error || `Baseline measurement failed with status ${response.status}`)
        }
        for (const row of payload?.results ?? []) {
          if (!("error" in row)) {
            updates.set(row.id, {
              benchmarkPrice: row.benchmarkPrice,
              outcomes: row.outcomes,
              benchmarkOutcomes: row.benchmarkOutcomes,
              measurements: row.measurements,
            })
          }
        }
      }

      if (updates.size) {
        localChangesPendingRef.current = true
        setState((current) => ({
          ...current,
          holdingBaselines: current.holdingBaselines.map((baseline) => ({
            ...baseline,
            ...(updates.get(baseline.id) ?? {}),
          })),
          tracking: current.tracking
            ? { ...current.tracking, baselineMeasuredAt: new Date().toISOString() }
            : current.tracking,
        }))
      }
    } catch (error) {
      console.error("Unable to measure existing-holding baselines:", error)
    } finally {
      baselineMeasureRef.current = false
    }
  }, [activeProfile?.id])

  useEffect(() => {
    if (!hydrated || activeProfile?.id !== "suren" || !cloudReadyRef.current) return
    const baselineTickers = new Set(state.holdingBaselines.map((item) => item.ticker))
    const expectedTickers = state.tracking?.baselineTickers?.length
      ? state.tracking.baselineTickers
      : state.holdings.map((holding) => holding.ticker)
    const hasMissing = expectedTickers.some((ticker) => !baselineTickers.has(ticker))
    if (hasMissing || state.tracking?.baselineVersion !== HOLDING_BASELINE_VERSION) {
      void refreshHoldingBaselines()
    }
  }, [
    hydrated,
    activeProfile?.id,
    state.holdings,
    state.holdingBaselines,
    state.tracking?.baselineVersion,
    state.tracking?.baselineTickers,
    refreshHoldingBaselines,
  ])

  useEffect(() => {
    if (!hydrated || activeProfile?.id !== "suren" || !state.holdingBaselines.length) return
    if (state.holdingBaselines.some((baseline) => baselineNeedsMeasurement(baseline))) {
      void refreshBaselineMeasurements()
    }
  }, [
    hydrated,
    activeProfile?.id,
    state.holdingBaselines,
    refreshBaselineMeasurements,
  ])

  const refreshQuotes = useCallback(async () => {
    const symbols = Array.from(
      new Set(state.holdings.map((h) => h.ticker.trim().toUpperCase()).filter(Boolean)),
    )

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
      const response = await fetch(
        `/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
        { cache: "no-store" },
      )
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
    const refreshMs = state.holdings.length > 25 ? 60_000 : 10_000
    const interval = window.setInterval(refresh, refreshMs)
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
    localChangesPendingRef.current = true
    const h = normalizeHolding(holding)
    setState((prev) => {
      const idx = prev.holdings.findIndex((x) => x.ticker === h.ticker)
      const holdings = [...prev.holdings]
      if (idx === -1) holdings.push(h)
      else holdings[idx] = h
      return {
        ...prev,
        holdings: holdings
          .filter((x) => x.quantity > 0)
          .sort((a, b) => a.ticker.localeCompare(b.ticker)),
      }
    })
  }, [])

  const removeHolding = useCallback((ticker: string) => {
    localChangesPendingRef.current = true
    setState((prev) => ({
      ...prev,
      holdings: prev.holdings.filter(
        (h) => h.ticker !== ticker.trim().toUpperCase(),
      ),
    }))
  }, [])

  const addCash = useCallback((_amount: number) => {
    setState((prev) => ({ ...prev, cash: 0 }))
  }, [])

  const withdrawCash = useCallback((_amount: number) => {
    setState((prev) => ({ ...prev, cash: 0 }))
  }, [])

  const addTransaction = useCallback((transaction: Omit<Transaction, "id">) => {
    localChangesPendingRef.current = true
    const t = { ...transaction, ticker: transaction.ticker.trim().toUpperCase() }
    setState((prev) => ({
      ...prev,
      transactions: [{ ...t, id: nextId() }, ...prev.transactions],
      holdings:
        getInstrument(t.ticker) || t.type === "Buy" || t.type === "Sell"
          ? applyTradeToHoldings(prev.holdings, t)
          : prev.holdings,
      cash: 0,
    }))
  }, [])

  const addTransactions = useCallback((batch: Omit<Transaction, "id">[]) => {
    localChangesPendingRef.current = true
    const normalized = batch.map((t) => ({
      ...t,
      ticker: t.ticker.trim().toUpperCase(),
    }))

    setState((prev) => ({
      ...prev,
      transactions: [
        ...normalized.map((t) => ({ ...t, id: nextId() })),
        ...prev.transactions,
      ],
      holdings: normalized.reduce(
        (acc, t) => applyTradeToHoldings(acc, t),
        prev.holdings,
      ),
      cash: 0,
    }))

    return normalized.length
  }, [])

  const removeTransaction = useCallback((id: string) => {
    localChangesPendingRef.current = true
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    localChangesPendingRef.current = true
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...patch,
        weights: {
          ...prev.settings.weights,
          ...(patch.weights ?? {}),
        },
      },
    }))
  }, [])

  const resetSettings = useCallback(() => {
    localChangesPendingRef.current = true
    setState((prev) => ({ ...prev, settings: DEFAULT_SETTINGS }))
  }, [])

  const addRecommendation = useCallback((r: RecommendationRecord) => {
    localChangesPendingRef.current = true
    setState((prev) => ({
      ...prev,
      recommendations: [r, ...prev.recommendations],
    }))
  }, [])

  const updateRecommendation = useCallback((id: string, patch: Partial<RecommendationRecord>) => {
    localChangesPendingRef.current = true
    setState((prev) => ({
      ...prev,
      recommendations: prev.recommendations.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }))
  }, [])

  const upsertJournalEntry = useCallback((entry: InvestmentJournalEntry) => {
    localChangesPendingRef.current = true
    const ticker = entry.ticker.trim().toUpperCase()
    setState((prev) => ({
      ...prev,
      journal: [
        { ...entry, ticker, updatedAt: new Date().toISOString() },
        ...prev.journal.filter((item) => item.ticker !== ticker),
      ],
    }))
  }, [])

  const removeJournalEntry = useCallback((ticker: string) => {
    localChangesPendingRef.current = true
    const normalized = ticker.trim().toUpperCase()
    setState((prev) => ({
      ...prev,
      journal: prev.journal.filter((item) => item.ticker !== normalized),
    }))
  }, [])

  const resetPortfolio = useCallback(() => {
    localChangesPendingRef.current = true
    setState(initialState())
  }, [])

  return (
    <StoreContext.Provider
      value={{
        ...state,
        portfolio,
        hydrated,
        quoteStatus,
        quoteError,
        quotesRefreshedAt,
        unavailableQuotes,
        refreshQuotes,
        refreshHoldingBaselines,
        refreshBaselineMeasurements,
        upsertHolding,
        removeHolding,
        addCash,
        withdrawCash,
        addTransaction,
        addTransactions,
        removeTransaction,
        updateSettings,
        resetSettings,
        addRecommendation,
        updateRecommendation,
        upsertJournalEntry,
        removeJournalEntry,
        resetPortfolio,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useDios() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useDios must be used within DiosProvider")
  return ctx
}
