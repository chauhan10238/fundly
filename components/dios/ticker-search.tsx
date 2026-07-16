"use client"

import { useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"
import { UNIVERSE_LIST } from "@/lib/dios/universe"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function TickerSearch({
  onSelect,
  placeholder = "Search ticker or name (e.g. NVDA, GLD, VOO)…",
}: {
  onSelect: (ticker: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const results = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (!q) return UNIVERSE_LIST.slice(0, 8)
    return UNIVERSE_LIST.filter(
      (i) => i.ticker.includes(q) || i.name.toUpperCase().includes(q) || i.sector.toUpperCase().includes(q),
    ).slice(0, 8)
  }, [query])

  function choose(ticker: string) {
    setQuery("")
    setOpen(false)
    onSelect(ticker)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (results[active]) choose(results[active].ticker)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120)
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="pl-9"
          aria-label="Search instrument"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {results.map((r, i) => (
            <li key={r.ticker}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (blurTimer.current) clearTimeout(blurTimer.current)
                  choose(r.ticker)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-left text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{r.ticker}</span>
                  <span className="max-w-[16rem] truncate text-muted-foreground">{r.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {r.type === "etf" ? "ETF" : r.sector}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
