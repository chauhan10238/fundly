"use client"

import { SCORE_LABELS } from "@/lib/dios/scoring"
import type { ScoreSet, ScoringWeights } from "@/lib/dios/types"
import { cn } from "@/lib/utils"

const ORDER: (keyof ScoreSet)[] = [
  "macro",
  "geopolitics",
  "earnings",
  "fundamentals",
  "valuation",
  "quality",
  "flows",
  "technical",
  "portfolioFit",
  "timing",
  "psychology",
  "opportunityCost",
]

function barColor(score: number) {
  if (score >= 70) return "bg-positive"
  if (score >= 50) return "bg-warning"
  return "bg-negative"
}

export function ScoreBreakdown({ scores, weights }: { scores: ScoreSet; weights: ScoringWeights }) {
  return (
    <div className="divide-y divide-border">
      {ORDER.map((key) => {
        const score = scores[key]
        return (
          <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">{SCORE_LABELS[key]}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                w{weights[key]}
              </span>
            </div>
            <span className="text-right font-mono text-sm font-semibold tabular-nums">{score}</span>
            <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className={cn("h-full rounded-full", barColor(score))} style={{ width: `${score}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
