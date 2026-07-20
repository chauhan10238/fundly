"use client"

import { useState } from "react"
import { pdf } from "@react-pdf/renderer"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DiosShareableReport } from "@/lib/reports/types"
import { DiosReportPdf } from "./report-pdf"

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-base font-semibold">{value}</p>
    </div>
  )
}

export function SharedReportView({
  report,
}: {
  report: DiosShareableReport
}) {
  const [downloading, setDownloading] = useState(false)

  async function download() {
    setDownloading(true)
    try {
      const blob = await pdf(<DiosReportPdf report={report} />).toBlob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `DIOS-${report.ticker}-Shared-Report.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                DIOS Investment Intelligence
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{report.companyName}</h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{report.ticker}</p>
            </div>
            <Button onClick={download} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Recommendation" value={report.recommendation} />
            <Metric label="Confidence" value={`${report.confidence}%`} />
            <Metric
              label="Current price"
              value={
                report.price !== undefined
                  ? `${report.currency ?? "USD"} ${report.price.toFixed(2)}`
                  : "Not available"
              }
            />
            <Metric
              label="Financial health"
              value={
                report.financialHealth
                  ? `${report.financialHealth.score}/100`
                  : "Not available"
              }
            />
          </div>
        </div>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Executive Summary</h2>
          <div className="mt-4 space-y-2">
            {report.executiveSummary.map((line) => (
              <p key={line} className="text-sm leading-6 text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Investment Reasons</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {report.investmentReasons.map((item) => (
                <li key={item}>+ {item}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Risks</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {report.risks.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Financial Metrics</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.financialMetrics.map((item) => (
              <Metric key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">News Intelligence</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {report.news.sentiment} sentiment, {report.news.sentimentScore}/100,
            based on the available articles.
          </p>
          <div className="mt-4 divide-y">
            {report.news.headlines.map((headline) => (
              <a
                key={`${headline.url}-${headline.title}`}
                href={headline.url}
                target="_blank"
                rel="noreferrer"
                className="block py-3 text-sm hover:underline"
              >
                {headline.title}
                <span className="ml-2 text-xs text-muted-foreground">
                  {headline.source}
                </span>
              </a>
            ))}
          </div>
        </section>

        <p className="pb-10 text-xs leading-5 text-muted-foreground">
          {report.disclaimer}
        </p>
      </div>
    </main>
  )
}
