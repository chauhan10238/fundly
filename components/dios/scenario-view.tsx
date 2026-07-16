"use client"

import type { Scenarios } from "@/lib/dios/types"
import { fmtPct } from "@/lib/format"
import { cn } from "@/lib/utils"

const ROWS = [
  { key: "bull" as const, label: "Bull", color: "bg-positive", text: "text-positive" },
  { key: "base" as const, label: "Base", color: "bg-primary", text: "text-primary" },
  { key: "bear" as const, label: "Bear", color: "bg-negative", text: "text-negative" },
]

export function ScenarioView({ scenarios }: { scenarios: Scenarios }) {
  // Determine a symmetric axis range across all scenarios.
  const values = [
    scenarios.bull.low, scenarios.bull.high,
    scenarios.base.low, scenarios.base.high,
    scenarios.bear.low, scenarios.bear.high,
  ]
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = max - min || 1
  const zeroPct = ((0 - min) / span) * 100

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-3">
        {ROWS.map((row) => {
          const s = scenarios[row.key]
          const leftPct = ((s.low - min) / span) * 100
          const widthPct = ((s.high - s.low) / span) * 100
          return (
            <div key={row.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={cn("font-semibold", row.text)}>{row.label}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {fmtPct(s.probability * 100, 0)} prob.
                  </span>
                </div>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {fmtPct(s.low * 100, 0)} to {fmtPct(s.high * 100, 0)}
                </span>
              </div>
              <div className="relative h-6 rounded bg-muted/60">
                <div
                  className="absolute top-0 bottom-0 w-px bg-border"
                  style={{ left: `${zeroPct}%` }}
                  aria-hidden
                />
                <div
                  className={cn("absolute top-1 bottom-1 rounded", row.color)}
                  style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="space-y-3 border-t border-border pt-3">
        {ROWS.map((row) => (
          <div key={row.key}>
            <p className={cn("text-xs font-semibold uppercase tracking-wide", row.text)}>{row.label} assumptions</p>
            <ul className="mt-1 space-y-0.5">
              {scenarios[row.key].assumptions.map((a, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                  <span className="text-muted-foreground/60">-</span>
                  <span className="text-pretty">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
