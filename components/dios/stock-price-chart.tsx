"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type RangeKey = "1D" | "1W" | "1M" | "1Y" | "5Y"
type HistoryPoint = { timestamp: string; close: number; volume: number }
type HistoryPayload = {
  ticker?: string
  range?: RangeKey
  points?: HistoryPoint[]
  summary?: { first: number; last: number; change: number; changePercent: number; high: number; low: number }
  provider?: string
  error?: string
}

const RANGES: RangeKey[] = ["1D", "1W", "1M", "1Y", "5Y"]

function money(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value)
}

function axisLabel(value: string, range: RangeKey) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  if (range === "1D") return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })
  if (range === "5Y") return date.toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
  return date.toLocaleDateString("en-AU", {
    day: "numeric", month: "short", ...(range === "1Y" ? { year: "2-digit" } : {}),
  })
}

export function StockPriceChart({ ticker }: { ticker: string }) {
  const [range, setRange] = useState<RangeKey>("1M")
  const [payload, setPayload] = useState<HistoryPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!ticker) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/history?ticker=${encodeURIComponent(ticker)}&range=${range}&t=${Date.now()}`,
        { cache: "no-store" },
      )
      const data = await response.json() as HistoryPayload
      if (!response.ok || !data.points?.length) {
        throw new Error(data.error || `Historical price request failed (${response.status})`)
      }
      setPayload(data)
    } catch (cause) {
      setPayload(null)
      setError(cause instanceof Error ? cause.message : "Unable to retrieve historical prices.")
    } finally {
      setLoading(false)
    }
  }, [ticker, range])

  useEffect(() => { void load() }, [load])

  const chartData = useMemo(() =>
    (payload?.points ?? []).map((point) => ({ ...point, label: axisLabel(point.timestamp, range) })),
    [payload, range]
  )

  const positive = (payload?.summary?.change ?? 0) >= 0

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{ticker} price history</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {payload?.summary && (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-semibold tabular-nums">{money(payload.summary.last)}</span>
              <span className={`text-sm font-medium tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}>
                {positive ? "+" : ""}{money(payload.summary.change)} ({positive ? "+" : ""}{payload.summary.changePercent.toFixed(2)}%)
              </span>
              <span className="text-xs text-muted-foreground">{range} range</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {RANGES.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={range === item ? "default" : "outline"}
              className="h-8 min-w-11 px-2"
              onClick={() => setRange(item)}
              disabled={loading && range === item}
            >
              {item}
            </Button>
          ))}
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
            onClick={() => void load()} disabled={loading} aria-label="Refresh price chart">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : (
        <div className="mt-4 h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" minTickGap={28} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={["auto", "auto"]} width={66} tick={{ fontSize: 11 }}
                axisLine={false} tickLine={false}
                tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
              <Tooltip
                formatter={(value) => [money(Number(value)), "Close"]}
                labelFormatter={(_, items) => {
                  const timestamp = items?.[0]?.payload?.timestamp
                  if (!timestamp) return ""
                  return new Date(timestamp).toLocaleString("en-AU", {
                    dateStyle: "medium", ...(range === "1D" ? { timeStyle: "short" } : {}),
                  })
                }}
              />
              <Area type="monotone" dataKey="close" stroke="currentColor"
                strokeWidth={2} fill="url(#priceFill)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {payload?.summary && !error && (
        <div className="mt-3 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground sm:grid-cols-3">
          <span>Range low: <strong className="text-foreground">{money(payload.summary.low)}</strong></span>
          <span>Range high: <strong className="text-foreground">{money(payload.summary.high)}</strong></span>
          <span className="sm:text-right">Source: {payload.provider ?? "Market data provider"}</span>
        </div>
      )}
    </section>
  )
}
