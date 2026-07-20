import { NextRequest, NextResponse } from "next/server"
import { createReportToken } from "@/lib/reports/share-token"
import type { DiosShareableReport } from "@/lib/reports/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isValidReport(value: unknown): value is DiosShareableReport {
  if (!value || typeof value !== "object") return false
  const report = value as Partial<DiosShareableReport>
  return (
    report.version === "3.3" &&
    typeof report.ticker === "string" &&
    typeof report.companyName === "string" &&
    typeof report.recommendation === "string" &&
    typeof report.confidence === "number"
  )
}

export async function POST(request: NextRequest) {
  try {
    const text = await request.text()

    if (Buffer.byteLength(text, "utf8") > 150_000) {
      return NextResponse.json(
        { error: "Report is too large to share" },
        { status: 413 },
      )
    }

    const body = JSON.parse(text) as { report?: unknown }

    if (!isValidReport(body.report)) {
      return NextResponse.json(
        { error: "Invalid report payload" },
        { status: 400 },
      )
    }

    const token = createReportToken(body.report)
    const url = new URL(`/share/${token}`, request.nextUrl.origin).toString()

    return NextResponse.json({
      url,
      expiresInDays: 30,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create shared report",
      },
      { status: 500 },
    )
  }
}
