"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SearchResult = { symbol: string; name: string; exchange: string; type: "stock" | "etf"; currency?: string }

export function TickerSearch({ onSelect, placeholder = "Search ticker or name (e.g. NVIDIA, GLD, Vanguard)…" }: { onSelect: (ticker: string) => void; placeholder?: string }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  async function runSearch(raw: string) {
    const q = raw.trim()
    if (!q) { setResults([]); setMessage(null); setLoading(false); return }
    const id = ++requestId.current
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 6000)
    setLoading(true); setMessage(null); setOpen(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store", signal: controller.signal })
      const payload = await response.json().catch(() => ({})) as { results?: SearchResult[]; provider?: string; diagnostics?: Record<string, string> }
      if (id !== requestId.current) return
      const rows = Array.isArray(payload.results) ? payload.results : []
      setResults(rows); setActive(0)
      setMessage(rows.length ? `Results via ${payload.provider ?? "market search"}` : "No matches. Press Enter to analyse the ticker directly.")
    } catch (error) {
      if (id !== requestId.current) return
      setResults([])
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "Search timed out. Press Enter to analyse the ticker directly." : "Search is temporarily unavailable. Press Enter to analyse the ticker directly.")
    } finally {
      window.clearTimeout(timeout)
      if (id === requestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults([]); setMessage(null); return }
    const timer = window.setTimeout(() => void runSearch(q), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  function choose(ticker: string) {
    const normalized = ticker.trim().toUpperCase()
    if (!normalized) return
    setQuery(normalized); setOpen(false); onSelect(normalized)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, Math.max(0, results.length - 1))) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[active]?.symbol ?? query) }
    else if (e.key === "Escape") setOpen(false)
  }

  return (
    <div className="relative z-50">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {loading && <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true) }} onFocus={() => { setOpen(true); if (query.trim() && !results.length) void runSearch(query) }} onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 200) }} onKeyDown={onKeyDown} placeholder={placeholder} className="pl-9 pr-9" aria-label="Search instrument" />
        </div>
        <Button type="button" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={() => results[active] ? choose(results[active].symbol) : void runSearch(query)} disabled={!query.trim() || loading}>Search</Button>
      </div>
      {open && query.trim() && (
        <div className="absolute left-0 right-0 z-[100] mt-1 max-h-96 overflow-auto rounded-md border border-border bg-popover p-1 shadow-2xl">
          {results.length ? <ul>{results.map((r, i) => (
            <li key={`${r.symbol}-${r.exchange}`}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); if (blurTimer.current) clearTimeout(blurTimer.current); choose(r.symbol) }} onMouseEnter={() => setActive(i)} className={cn("flex w-full items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-left text-sm", i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted")}>
                <span className="min-w-0"><span className="font-mono font-semibold">{r.symbol}</span><span className="ml-2 text-muted-foreground">{r.name}</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.type === "etf" ? "ETF" : "Stock"}{r.exchange ? ` · ${r.exchange}` : ""}</span>
              </button>
            </li>
          ))}</ul> : null}
          {message && <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{message}</div>}
        </div>
      )}
    </div>
  )
}
