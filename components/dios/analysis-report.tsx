"use client"

import Link from "next/link"
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react"
import type { AnalysisReport } from "@/lib/dios/types"
import { fmtCurrency, fmtPct } from "@/lib/format"
import {
  DeltaText,
  Panel,
  RecommendationBadge,
  RiskBadge,
  ScorePill,
} from "@/components/dios/ui-bits"
import { ScoreBreakdown } from "@/components/dios/score-breakdown"
import { ScenarioView } from "@/components/dios/scenario-view"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function ReasonList({
  items,
  icon,
  tone,
}: {
  items: string[]
  icon: React.ReactNode
  tone: string
}) {
  return (
    <ul className="space-y-2.5 p-4">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm">
          <span className={`mt-0.5 shrink-0 ${tone}`}>{icon}</span>
          <span className="text-pretty leading-relaxed text-foreground">{t}</span>
        </li>
      ))}
    </ul>
  )
}

export function AnalysisReportView({
  report,
  weights,
}: {
  report: AnalysisReport
  weights: import("@/lib/dios/types").ScoringWeights
}) {
  const r = report
  const pi = r.portfolioImpact

  return (
    <div className="space-y-6">
      {/* Header verdict card */}
      <Panel title={`${r.ticker} — ${r.name}`} description={`${r.instrumentType === "etf" ? "ETF" : "Stock"} · Horizon ${r.horizon}`}>
        <div className="grid gap-4 p-4 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center rounded-lg border border-border bg-muted/40 px-5 py-3">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall</span>
              <span className="font-mono text-4xl font-bold tabular-nums leading-none">{r.overallScore}</span>
              <span className="mt-1 text-[10px] text-muted-foreground">/ 100</span>
            </div>
            <div className="space-y-2">
              <RecommendationBadge value={r.recommendation} className="text-sm" />
              <div className="text-sm">
                <span className="text-muted-foreground">Price </span>
                <span className="font-mono font-semibold">{fmtCurrency(r.price)}</span>
                <span className="ml-2">
                  <DeltaText value={r.dailyChange} />
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Confidence" value={`${r.confidence}%`} />
            <Metric label="Suggested max" value={fmtPct(r.suggestedMaxWeight)} />
            <Metric label="Current weight" value={r.currentWeight > 0 ? fmtPct(r.currentWeight) : "—"} />
            <Metric label="Proposed weight" value={fmtPct(r.proposedWeight)} />
          </div>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          Model {r.modelVersion} · Scoring {r.scoringVersion} · Retrieved {new Date(r.lastUpdated).toLocaleString("en-US")}
          {!r.dataComplete && (
            <span className="ml-2 font-medium text-warning-foreground">Partial data — confidence reduced</span>
          )}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Why buy today" description="The case for acting now.">
          <ReasonList items={r.whyToday} icon={<CheckCircle2 className="h-4 w-4" />} tone="text-positive" />
        </Panel>
        <Panel title="Why not today" description="Reasons for caution.">
          <ReasonList items={r.whyNotToday} icon={<XCircle className="h-4 w-4" />} tone="text-negative" />
        </Panel>
        <Panel title="Why not wait" description="Cost of delaying the decision.">
          <ReasonList items={r.whyNotWait} icon={<Clock className="h-4 w-4" />} tone="text-primary" />
        </Panel>
        <Panel title="What changed recently" description="New information since the last look.">
          <ReasonList items={r.recentChanges} icon={<RefreshCw className="h-4 w-4" />} tone="text-muted-foreground" />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Score breakdown" description="Twelve weighted factors drive the overall score.">
          <ScoreBreakdown scores={r.scores} weights={weights} />
        </Panel>
        <Panel title="Scenario analysis" description="Probability-weighted return ranges for the horizon.">
          <ScenarioView scenarios={r.scenarios} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Better entry conditions" description="What would improve the setup.">
          <ReasonList items={r.betterEntryConditions} icon={<ArrowRight className="h-4 w-4" />} tone="text-primary" />
        </Panel>
        <Panel title="Thesis invalidation" description="What would prove the thesis wrong.">
          <ReasonList items={r.thesisInvalidation} icon={<AlertTriangle className="h-4 w-4" />} tone="text-warning-foreground" />
        </Panel>
      </div>

      {/* Portfolio impact */}
      <Panel title="Portfolio impact & fit" description="How this position interacts with what you already own.">
        <div className="space-y-4 p-4">
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-pretty leading-relaxed">
            {pi.concentrationNote}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Sector before" value={fmtPct(pi.sectorExposureBefore)} />
            <Metric label="Sector after" value={fmtPct(pi.sectorExposureAfter)} />
            <Metric label="Est. correlation" value={pi.correlation.toFixed(2)} />
            <Metric label="Diversification" value={pi.diversificationBenefit.split(" — ")[0]} />
          </div>
          {(pi.directOverlap.length > 0 || pi.lookThroughOverlap.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-warning-foreground" />
              <span className="text-muted-foreground">Overlaps with:</span>
              {[...pi.directOverlap, ...pi.lookThroughOverlap].map((t) => (
                <Link
                  key={t}
                  href={`/analyse?ticker=${t}`}
                  className="rounded bg-warning/20 px-1.5 py-0.5 font-mono text-xs font-medium text-warning-foreground"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Alternatives */}
      <Panel title="Alternatives considered" description="Other ways to express or improve on this idea.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instrument</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="hidden md:table-cell">Valuation</TableHead>
              <TableHead className="hidden lg:table-cell">Fit</TableHead>
              <TableHead>Rationale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {r.alternatives.map((a) => (
              <TableRow key={a.ticker}>
                <TableCell>
                  <Link href={`/analyse?ticker=${a.ticker}`} className="group block">
                    <span className="font-mono font-semibold group-hover:underline">{a.ticker}</span>
                    <span className="block max-w-[10rem] truncate text-xs text-muted-foreground">{a.name}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-center">
                  <ScorePill score={a.score} />
                </TableCell>
                <TableCell>
                  <RiskBadge band={a.risk} />
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">{a.valuation}</TableCell>
                <TableCell className="hidden text-sm lg:table-cell">{a.portfolioFit}</TableCell>
                <TableCell className="max-w-[18rem] text-xs text-muted-foreground text-pretty">{a.rationale}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      {/* Sources */}
      <Panel title="Sources & data lineage" description="Every claim is traceable. Demo citations are illustrative.">
        <ul className="divide-y divide-border">
          {r.sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">{s.id}</span>
              <span className="flex-1 text-foreground">{s.name}</span>
              <span className="text-xs text-muted-foreground">Published {s.date}</span>
              {s.url && s.url !== "#" && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  link
                </a>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold text-pretty">{value}</div>
    </div>
  )
}
