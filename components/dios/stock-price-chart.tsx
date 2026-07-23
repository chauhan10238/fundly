"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type RangeKey = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y"

type HistoryPoint = {
  timestamp: string
  close: number
  volume: number
}

type HistoryPayload = {
  ticker?: string
  range?: RangeKey
  interval?: string
  fallbackUsed?: boolean
  warning?: string
  points?: HistoryPoint[]
  summary?: {
    first: number
    last: number
    change: number
    changePercent: number
    high: number
    low: number
  }
  provider?: string
  refreshedAt?: string
  error?: string
}

const RANGES: RangeKey[] = [
  "1D",
  "5D",
  "1M",
  "3M",
  "6M",
  "1Y",
  "3Y",
  "5Y",
]

function money(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function intervalLabel(interval?: string) {
  if (interval === "5min") return "5-minute"
  if (interval === "15min") return "15-minute"
  if (interval === "1hour") return "hourly"
  if (interval === "1week") return "weekly"
  return "daily"
}

function axisLabel(value: string, range: RangeKey) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  if (range === "1D" || range === "5D") {
    return date.toLocaleString("en-AU", {
      weekday: range === "5D" ? "short" : undefined,
      hour: "numeric",
      minute: "2-digit",
    })
  }

  if (range === "3Y" || range === "5Y") {
    return date.toLocaleDateString("en-AU", {
      month: "short",
      year: "2-digit",
    })
  }

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    ...(range === "1Y" ? { year: "2-digit" } : {}),
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

      const raw = await response.text()
      let data: HistoryPayload

      try {
        data = JSON.parse(raw) as HistoryPayload
      } catch {
        throw new Error(
          "The history API returned an invalid response. Check the Vercel function logs.",
        )
      }

      if (!response.ok || !data.points?.length) {
        throw new Error(
          data.error || `Historical price request failed (${response.status})`,
        )
      }

      setPayload(data)
    } catch (cause) {
      setPayload(null)
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to retrieve historical prices.",
      )
    } finally {
      setLoading(false)
    }
  }, [ticker, range])

  useEffect(() => {
    void load()
  }, [load])

  const chartData = useMemo(
    () =>
      (payload?.points ?? []).map((point) => ({
        ...point,
        label: axisLabel(point.timestamp, range),
      })),
    [payload, range],
  )

  const positive = (payload?.summary?.change ?? 0) >= 0

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">
              {ticker} price history
            </h2>

            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}

            {payload?.interval && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {intervalLabel(payload.interval)} data
              </span>
            )}
          </div>

          {payload?.summary && (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-semibold tabular-nums">
                {money(payload.summary.last)}
              </span>

              <span
                className={`text-sm font-medium tabular-nums ${
                  positive ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {positive ? "+" : ""}
                {money(payload.summary.change)} ({positive ? "+" : ""}
                {payload.summary.changePercent.toFixed(2)}%)
              </span>

              <span className="text-xs text-muted-foreground">
                across the selected {range} range
              </span>
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

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh price chart"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {payload?.warning && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{payload.warning}</span>
        </div>
      )}

      {error ? (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : (
        <div className="mt-4 h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="label"
                minTickGap={32}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                domain={["auto", "auto"]}
                width={70}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
              />

              <Tooltip
                formatter={(value: number | string) => [
                  money(Number(value)),
                  "Close",
                ]}
                labelFormatter={(label) => String(label)}
              />

              <Area
                type="monotone"
                dataKey="close"
                stroke="currentColor"
                strokeWidth={2}
                fill="currentColor"
                fillOpacity={0.12}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {payload?.summary && !error && (
        <div className="mt-3 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground sm:grid-cols-4">
          <span>
            Low:{" "}
            <strong className="text-foreground">
              {money(payload.summary.low)}
            </strong>
          </span>

          <span>
            High:{" "}
            <strong className="text-foreground">
              {money(payload.summary.high)}
            </strong>
          </span>

          <span>
            Points:{" "}
            <strong className="text-foreground">
              {chartData.length.toLocaleString("en-AU")}
            </strong>
          </span>

          <span className="sm:text-right">
            Source: {payload.provider ?? "Market data provider"}
          </span>
        </div>
      )}
    </section>
  )
}
