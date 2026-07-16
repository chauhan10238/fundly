"use client"

import type { Allocation } from "@/lib/dios/portfolio-engine"
import { fmtPct } from "@/lib/format"

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
]

// Convert a polar coordinate to cartesian on the donut circle.
function polar(cx: number, cy: number, r: number, angle: number) {
  const a = (angle - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

// Build an SVG arc path for a donut segment.
function arc(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number) {
  const largeArc = end - start > 180 ? 1 : 0
  const o1 = polar(cx, cy, rOuter, end)
  const o2 = polar(cx, cy, rOuter, start)
  const i1 = polar(cx, cy, rInner, start)
  const i2 = polar(cx, cy, rInner, end)
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${i2.x} ${i2.y}`,
    "Z",
  ].join(" ")
}

export function AllocationDonut({ data, size = 160 }: { data: Allocation[]; size?: number }) {
  const top = data.slice(0, 7)
  const rest = data.slice(7)
  const restTotal = rest.reduce((s, a) => s + a.value, 0)
  const restPct = rest.reduce((s, a) => s + a.pct, 0)
  const chartData = restTotal > 0 ? [...top, { label: "Other", value: restTotal, pct: restPct }] : top

  const total = chartData.reduce((s, a) => s + a.value, 0) || 1
  const cx = size / 2
  const cy = size / 2
  const rOuter = size * 0.48
  const rInner = size * 0.3

  let cursor = 0
  const segments = chartData.map((a, i) => {
    const sweep = (a.value / total) * 360
    const start = cursor
    // Leave a tiny gap between segments for definition.
    const end = cursor + sweep
    cursor = end
    return { path: arc(cx, cy, rOuter, rInner, start + 0.6, Math.max(start + 0.6, end - 0.6)), color: PALETTE[i % PALETTE.length] }
  })

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="Allocation breakdown">
        {segments.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="var(--card)" strokeWidth={1.5} />
        ))}
      </svg>
      <ul className="w-full flex-1 space-y-1.5">
        {chartData.map((a, i) => (
          <li key={a.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            <span className="flex-1 truncate text-foreground">{a.label}</span>
            <span className="font-medium tabular-nums text-muted-foreground">{fmtPct(a.pct)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
