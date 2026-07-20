"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, BrainCircuit } from "lucide-react"
import { useDios } from "@/components/dios/store"
import { fmtCurrency, fmtDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PositionDetailPage() {
  const params = useParams<{ ticker: string }>()
  const ticker = decodeURIComponent(params.ticker ?? "").toUpperCase()
  const { portfolio, transactions, recommendations } = useDios()

  const position = portfolio.positions.find((item) => item.ticker === ticker)

  const history = useMemo(
    () =>
      transactions
        .filter((item) => item.ticker === ticker)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, ticker],
  )

  const latestRecommendation = useMemo(
    () =>
      recommendations
        .filter((item) => item.ticker === ticker)
        .sort((a, b) => b.datetime.localeCompare(a.datetime))[0],
    [recommendations, ticker],
  )

  if (!position) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button variant="outline" render={<Link href="/portfolio" />}>
          <ArrowLeft className="h-4 w-4" />
          Back to portfolio
        </Button>
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">{ticker} is not currently held</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" render={<Link href="/portfolio" />}>
            <ArrowLeft className="h-4 w-4" />
            Portfolio
          </Button>
          <h1 className="mt-2 text-3xl font-semibold">{ticker}</h1>
          <p className="text-muted-foreground">
            {position.instrument.name} · {position.instrument.type.toUpperCase()} · {position.instrument.sector}
          </p>
        </div>

        <Button render={<Link href={`/analyse?ticker=${encodeURIComponent(ticker)}`} />}>
          <BrainCircuit className="h-4 w-4" />
          Run DIOS analysis
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Quantity" value={position.quantity.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")} />
        <Metric label="Average bought @" value={fmtCurrency(position.avgCost)} />
        <Metric label="Current price" value={fmtCurrency(position.price)} detail={position.priceSource === "live" ? "Live market price" : "Fallback price"} />
        <Metric
          label="Open P/L"
          value={`${fmtCurrency(position.unrealisedPL, "USD", 0)} (${position.unrealisedPLPct >= 0 ? "+" : ""}${position.unrealisedPLPct.toFixed(2)}%)`}
          tone={position.unrealisedPL >= 0 ? "positive" : "negative"}
        />
        <Metric label="Cost basis" value={fmtCurrency(position.costBasis, "USD", 0)} />
        <Metric label="Current value" value={fmtCurrency(position.marketValue, "USD", 0)} />
        <Metric label="Portfolio weight" value={`${position.weight.toFixed(2)}%`} />
        <Metric
          label="Today"
          value={`${fmtCurrency(position.dayChangeValue, "USD", 0)} (${position.dayChangePct >= 0 ? "+" : ""}${position.dayChangePct.toFixed(2)}%)`}
          tone={position.dayChangeValue >= 0 ? "positive" : "negative"}
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Latest DIOS decision</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest saved recommendation for this holding.
            </p>
          </div>
          {latestRecommendation ? (
            <div className="text-right">
              <div className="text-lg font-semibold">{latestRecommendation.recommendation}</div>
              <div className="text-sm text-muted-foreground">
                Score {latestRecommendation.overallScore}/100 · Confidence {latestRecommendation.confidence}%
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No saved analysis yet</div>
          )}
        </div>

        {latestRecommendation?.reasons?.length ? (
          <ul className="mt-4 space-y-2 text-sm">
            {latestRecommendation.reasons.slice(0, 3).map((reason) => (
              <li key={reason} className="rounded-md bg-muted/40 p-3">{reason}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Purchase and sale history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every DIOS or Stake-imported transaction for {ticker}.
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Trade value</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{fmtDate(transaction.date)}</TableCell>
                  <TableCell className={transaction.type === "Buy" ? "text-positive" : transaction.type === "Sell" ? "text-negative" : ""}>
                    {transaction.type}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{transaction.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCurrency(transaction.price)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtCurrency(transaction.quantity * transaction.price, "USD", 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtCurrency((transaction.brokerageFee ?? 0) + (transaction.fxFee ?? 0))}
                  </TableCell>
                  <TableCell className="max-w-[18rem] truncate text-xs text-muted-foreground">
                    {transaction.notes ?? "DIOS transaction"}
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No transaction history is stored for this position.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail?: string
  tone?: "positive" | "negative"
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-xl font-semibold ${
        tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : ""
      }`}>
        {value}
      </div>
      {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  )
}
