"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
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

export function AllocationDonut({
  data,
  size = 160,
}: {
  data: Allocation[]
  size?: number
}) {
  const top = data.slice(0, 7)
  const rest = data.slice(7)
  const restTotal = rest.reduce((s, a) => s + a.value, 0)
  const restPct = rest.reduce((s, a) => s + a.pct, 0)
  const chartData = restTotal > 0 ? [...top, { label: "Other", value: restTotal, pct: restPct }] : top

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div style={{ width: size, height: size }} className="shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius={size * 0.3}
              outerRadius={size * 0.48}
              paddingAngle={1.5}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full flex-1 space-y-1.5">
        {chartData.map((a, i) => (
          <li key={a.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            <span className="flex-1 truncate text-foreground">{a.label}</span>
            <span className="tabular-nums font-medium text-muted-foreground">{fmtPct(a.pct)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
