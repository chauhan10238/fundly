"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SearchResult = {
  symbol: string
  name: string
  exchange: string
  type: "stock" | "etf"
  currency?: string
}

type TickerSearchProps = {
  onSelect: (ticker: string) => void
  currentTicker?: string
  placeholder?: string
}

export function TickerSearch({
  onSelect,
  currentTicker = "",
  placeholder = "Search ticker or name (e.g. NVIDIA, GLD, Vanguard)…",
}: TickerSearchProps) {
  const [query, setQuery] = useState(currentTicker)
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  // Keep the input aligned with browser navigation and quick-pick changes.
  useEffect(() => {
    setQuery(currentTicker)
    setResults([])
    setOpen(false)
    setMessage(null)
  }, [currentTicker])

  async function runSearch(raw: string) {
    const q = raw.trim()
    if (!q) {
      setResults([])
      setMessage(null)
      setLoading(false)
      return
    }

    const id = ++requestId.current
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 6000)

    setLoading(true)
    setMessage(null)
    setOpen(true)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
      const payload = (await response.json().catch(() => ({}))) as {
        results?: SearchResult[]
        provider?: string
      }

      if (id !== requestId.current) return

      const rows = Array.isArray(payload.results) ? payload.results : []
      setResults(rows)
      setActive(0)
      setMessage(
        rows.length
          ? `Results via ${payload.provider ?? "market search"}`
          : "No suggestions found. Press Enter or Search to analyse the symbol directly.",
      )
    } catch (error) {
      if (id !== requestId.current) return
      setResults([])
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Search timed out. Press Enter or Search to analyse the symbol directly."
          : "Search is temporarily unavailable. Press Enter or Search to analyse the symbol directly.",
      )
    } finally {
      window.clearTimeout(timeout)
      if (id === requestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    const q = query.trim()
    if (!q || q.toUpperCase() === currentTicker.toUpperCase()) {
      setResults([])
      setMessage(null)
      return
    }

    const timer = window.setTimeout(() => void runSearch(q), 220)
    return () => window.clearTimeout(timer)
  }, [query, currentTicker])

  function choose(rawTicker: string) {
    const normalized = rawTicker.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
    if (!normalized) return

    if (blurTimer.current) window.clearTimeout(blurTimer.current)
    setQuery(normalized)
    setOpen(false)
    setResults([])
    setMessage(null)
    onSelect(normalized)
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    // A highlighted suggestion wins; otherwise the exact text is submitted immediately.
    choose(results[active]?.symbol ?? query)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((value) => Math.min(value + 1, Math.max(0, results.length - 1)))
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((value) => Math.max(value - 1, 0))
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      choose(results[active]?.symbol ?? query)
      return
    }

    if (event.key === "Escape") setOpen(false)
  }

  return (
    <div className="relative z-50">
      <form className="flex gap-2" onSubmit={submit}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {loading && (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              if (query.trim() && query.toUpperCase() !== currentTicker.toUpperCase()) {
                setOpen(true)
                if (!results.length) void runSearch(query)
              }
            }}
            onBlur={() => {
              blurTimer.current = window.setTimeout(() => setOpen(false), 180)
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="pl-9 pr-9"
            aria-label="Search instrument"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="outline" disabled={!query.trim()}>
          Search
        </Button>
      </form>

      {open && query.trim() && query.toUpperCase() !== currentTicker.toUpperCase() && (
        <div className="absolute left-0 right-0 z-[100] mt-1 max-h-96 overflow-auto rounded-md border border-border bg-popover p-1 shadow-2xl">
          {results.length ? (
            <ul>
              {results.map((result, index) => (
                <li key={`${result.symbol}-${result.exchange}-${index}`}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      choose(result.symbol)
                    }}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-left text-sm",
                      index === active
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="font-mono font-semibold">{result.symbol}</span>
                      <span className="ml-2 text-muted-foreground">{result.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {result.type === "etf" ? "ETF" : "Stock"}
                      {result.exchange ? ` · ${result.exchange}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {message && (
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
