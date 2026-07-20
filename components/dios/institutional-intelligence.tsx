"use client"

import {
  Activity,
  CalendarClock,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Newspaper,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import type { InstitutionalCompanyIntelligence } from "@/lib/data-providers"
import { Panel, ScorePill, StatCard } from "@/components/dios/ui-bits"
import { cn } from "@/lib/utils"

function money(value?: number, currency = "USD") {
  if (value === undefined || !Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  const suffix =
    abs >= 1e12 ? "T" :
    abs >= 1e9 ? "B" :
    abs >= 1e6 ? "M" : ""

  const divisor =
    abs >= 1e12 ? 1e12 :
    abs >= 1e9 ? 1e9 :
    abs >= 1e6 ? 1e6 : 1

  return `${value < 0 ? "-" : ""}${currency} ${Math.abs(value / divisor).toFixed(abs >= 1e6 ? 2 : 0)}${suffix}`
}

function percent(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return "—"
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

function ratio(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return "—"
  return value.toFixed(2)
}

function sentimentClass(value: "positive" | "neutral" | "negative") {
  return value === "positive"
    ? "text-positive"
    : value === "negative"
      ? "text-negative"
      : "text-muted-foreground"
}

export function InstitutionalIntelligenceView({
  intelligence,
}: {
  intelligence: InstitutionalCompanyIntelligence
}) {
  const fundamentals = intelligence.fundamentals
  const health = intelligence.financialHealth
  const earnings = intelligence.earnings
  const news = intelligence.news

  return (
    <div className="space-y-6">
      <Panel
        title="Institutional Intelligence"
        description={`Normalized across ${intelligence.providerConfidence.connected.join(", ") || "available providers"}.`}
        action={
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="h-4 w-4 text-positive" />
            <span className="text-muted-foreground">Source confidence</span>
            <ScorePill score={intelligence.providerConfidence.score} size="sm" />
          </div>
        }
      >
        <div className="grid gap-0 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Company snapshot
            </p>
            <h2 className="mt-1 text-xl font-semibold">{intelligence.entityName}</h2>
            <div className="mt-3 space-y-2">
              {intelligence.summary.map((line) => (
                <p key={line} className="text-sm leading-6 text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Connected sources
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {intelligence.providerConfidence.connected.map((provider) => (
                <span
                  key={provider}
                  className="rounded-md border border-positive/30 bg-positive/10 px-2 py-1 text-xs font-medium text-positive"
                >
                  {provider}
                </span>
              ))}
              {intelligence.providerConfidence.unavailable.map((provider) => (
                <span
                  key={provider}
                  className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {provider} unavailable
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Refreshed {new Date(intelligence.retrievedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </Panel>

      {health && fundamentals && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard
              label="Financial Health"
              value={`${health.score}/100`}
              sub={health.label}
              accent={health.score >= 70 ? "positive" : health.score >= 50 ? "warning" : "negative"}
            />
            <StatCard
              label="Revenue TTM"
              value={money(fundamentals.revenueTTM, fundamentals.currency)}
              sub={`${percent(fundamentals.revenueGrowth?.changePercent)} annual growth`}
            />
            <StatCard
              label="Free Cash Flow TTM"
              value={money(fundamentals.freeCashFlowTTM, fundamentals.currency)}
              sub={`${percent(fundamentals.freeCashFlowMargin)} margin`}
              accent={(fundamentals.freeCashFlowTTM ?? 0) >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label="Net Income TTM"
              value={money(fundamentals.netIncomeTTM, fundamentals.currency)}
              sub={`${percent(fundamentals.profitMargin)} margin`}
            />
          </div>

          <Panel title="Financial Health Breakdown" description="SEC-derived financial statements normalized into five quality pillars.">
            <div className="grid gap-0 divide-y md:grid-cols-5 md:divide-x md:divide-y-0">
              {health.pillars.map((pillar) => (
                <div key={pillar.name} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{pillar.name}</p>
                    <ScorePill score={pillar.score} size="sm" />
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        pillar.score >= 70
                          ? "bg-positive"
                          : pillar.score >= 50
                            ? "bg-warning"
                            : "bg-negative",
                      )}
                      style={{ width: `${pillar.score}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {pillar.explanation}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Profitability & Efficiency">
              <div className="grid grid-cols-2 gap-px bg-border">
                {[
                  ["Gross margin", percent(fundamentals.grossMargin)],
                  ["Operating margin", percent(fundamentals.operatingMargin)],
                  ["Profit margin", percent(fundamentals.profitMargin)],
                  ["Return on equity", percent(fundamentals.returnOnEquity)],
                  ["EPS diluted TTM", fundamentals.epsDilutedTTM?.toFixed(2) ?? "—"],
                  ["Book value/share", money(fundamentals.bookValuePerShare, fundamentals.currency)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-card p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 font-mono text-base font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Balance Sheet">
              <div className="grid grid-cols-2 gap-px bg-border">
                {[
                  ["Cash", money(fundamentals.cash, fundamentals.currency)],
                  ["Total debt", money(fundamentals.totalDebt, fundamentals.currency)],
                  ["Assets", money(fundamentals.assets, fundamentals.currency)],
                  ["Equity", money(fundamentals.equity, fundamentals.currency)],
                  ["Debt / equity", ratio(fundamentals.debtToEquity)],
                  ["Current ratio", ratio(fundamentals.currentRatio)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-card p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 font-mono text-base font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {(health.strengths.length > 0 || health.risks.length > 0) && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Financial Strengths">
                <div className="space-y-2 p-4">
                  {health.strengths.length ? health.strengths.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm">
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                      <span>{item}</span>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No high-conviction strengths detected from available facts.</p>}
                </div>
              </Panel>
              <Panel title="Financial Risks">
                <div className="space-y-2 p-4">
                  {health.risks.length ? health.risks.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm">
                      <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
                      <span>{item}</span>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No material financial warning triggered by the current rules.</p>}
                </div>
              </Panel>
            </div>
          )}
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Earnings Intelligence"
          description="Finnhub calendar and reported estimate comparisons."
          action={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="grid grid-cols-2 gap-px bg-border">
            {[
              ["Next earnings", earnings.nextDate ?? "Not available"],
              ["Days until", earnings.daysUntil !== undefined ? String(earnings.daysUntil) : "—"],
              ["EPS estimate", earnings.epsEstimate?.toFixed(2) ?? "—"],
              ["Revenue estimate", money(earnings.revenueEstimate)],
              ["Last EPS surprise", percent(earnings.latestEpsSurprisePercent)],
              ["Last revenue surprise", percent(earnings.latestRevenueSurprisePercent)],
            ].map(([label, value]) => (
              <div key={label} className="bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-mono text-base font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="News Intelligence"
          description={`${news.articleCount} recent articles assessed.`}
          action={<Newspaper className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="p-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-xs text-muted-foreground">Overall sentiment</p>
                <p className={cn("mt-1 text-lg font-semibold capitalize", sentimentClass(news.sentiment))}>
                  {news.sentiment}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold">{news.sentimentScore}/100</p>
                <p className="text-xs text-muted-foreground">{news.confidence}% confidence</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {news.themes.map((theme) => (
                <span key={theme.theme} className="rounded-md border bg-muted/40 px-2 py-1 text-xs">
                  {theme.theme} · {theme.mentions}
                </span>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Key Headlines" description="Most recent deduplicated company news from connected providers.">
        <div className="divide-y">
          {news.keyHeadlines.length ? news.keyHeadlines.map((headline) => (
            <a
              key={`${headline.url}-${headline.title}`}
              href={headline.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-start justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
            >
              <div>
                <p className="text-sm font-medium leading-5">{headline.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {headline.source} · {new Date(headline.publishedAt).toLocaleString()}
                </p>
              </div>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          )) : (
            <p className="p-4 text-sm text-muted-foreground">No recent company headlines were returned.</p>
          )}
        </div>
      </Panel>

      <Panel
        title="SEC Filings"
        description="Compact links to the latest official company filings."
        action={<FileText className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="divide-y">
          {intelligence.filings.length ? intelligence.filings.map((filing) => (
            <a
              key={`${filing.form}-${filing.filingDate}-${filing.url}`}
              href={filing.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-md border bg-muted px-2 py-1 font-mono text-xs font-semibold">
                  {filing.form}
                </span>
                <div>
                  <p className="text-sm font-medium">{filing.description || `${filing.form} filing`}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Filed {filing.filingDate}
                    {filing.reportDate ? ` · Period ${filing.reportDate}` : ""}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          )) : (
            <p className="p-4 text-sm text-muted-foreground">No recent SEC filings were returned.</p>
          )}
        </div>
      </Panel>
    </div>
  )
}
