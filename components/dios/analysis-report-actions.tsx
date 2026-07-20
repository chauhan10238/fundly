"use client"

import { useMemo, useState } from "react"
import { pdf } from "@react-pdf/renderer"
import { Check, Copy, Download, Loader2, Share2 } from "lucide-react"
import { toast } from "sonner"
import type {
  AnalysisReport,
  ExternalAnalysisContext,
  MarketSnapshot,
} from "@/lib/dios/types"
import type { InstitutionalCompanyIntelligence } from "@/lib/data-providers"
import { Button } from "@/components/ui/button"
import { buildShareableReport } from "@/lib/reports/build-report"
import { DiosReportPdf } from "./report-pdf"

export function AnalysisReportActions(props: {
  report: AnalysisReport
  intelligence: InstitutionalCompanyIntelligence | null
  snapshot: MarketSnapshot | null
  context: ExternalAnalysisContext | null
}) {
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const reportData = useMemo(
    () =>
      buildShareableReport({
        report: props.report,
        intelligence: props.intelligence,
        snapshot: props.snapshot,
        context: props.context,
      }),
    [props.report, props.intelligence, props.snapshot, props.context],
  )

  async function downloadPdf() {
    setDownloading(true)
    try {
      const blob = await pdf(<DiosReportPdf report={reportData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `DIOS-${reportData.ticker}-Analysis-${reportData.generatedAt.slice(0, 10)}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success("PDF report downloaded")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create PDF report",
      )
    } finally {
      setDownloading(false)
    }
  }

  async function createShareLink() {
    setSharing(true)
    try {
      const response = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: reportData }),
      })
      const payload = (await response.json()) as {
        url?: string
        error?: string
      }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to create share link")
      }

      setShareUrl(payload.url)
      await navigator.clipboard.writeText(payload.url)
      setCopied(true)
      toast.success("Secure share link copied", {
        description: "The link expires after 30 days.",
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create share link",
      )
    } finally {
      setSharing(false)
    }
  }

  async function copyAgain() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success("Share link copied")
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" onClick={downloadPdf} disabled={downloading}>
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download PDF
      </Button>

      <Button onClick={createShareLink} disabled={sharing}>
        {sharing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
        Share report
      </Button>

      {shareUrl ? (
        <Button variant="ghost" size="sm" onClick={copyAgain}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copy link
        </Button>
      ) : null}
    </div>
  )
}
