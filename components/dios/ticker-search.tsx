"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SearchResult = {
  symbol: string
  name: string
  exchange: string
  type: "stock" | "etf"
  currency?: string
}

export function TickerSearch({
  onSelect,
  placeholder = "Search ticker or name (e.g. NVIDIA, GLD, Vanguard)…",
}: {
  onSelect: (ticker: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store", signal: controller.signal })
        const payload = await response.json() as { results?: SearchResult[] }
        setResults(Array.isArray(payload.results) ? payload.results : [])
        setActive(0)
        setOpen(true)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function choose(ticker: string) {
    setQuery(ticker)
    setOpen(false)
    onSelect(ticker)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (results[active]) choose(results[active].symbol)
      else if (query.trim()) choose(query.trim().toUpperCase())
    } else if (e.key === "Escape") setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {loading && <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150) }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
          aria-label="Search instrument"
        />
      </div>
      {open && query.trim() && (
        <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {results.length ? results.map((r, i) => (
            <li key={`${r.symbol}-${r.exchange}`}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); if (blurTimer.current) clearTimeout(blurTimer.current); choose(r.symbol) }}
                onMouseEnter={() => setActive(i)}
                className={cn("flex w-full items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-left text-sm", i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
              >
                <span className="min-w-0">
                  <span className="font-mono font-semibold">{r.symbol}</span>
                  <span className="ml-2 text-muted-foreground">{r.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.type === "etf" ? "ETF" : "Stock"}{r.exchange ? ` · ${r.exchange}` : ""}</span>
              </button>
            </li>
          )) : !loading ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No matches. Press Enter to try the ticker directly.</li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
