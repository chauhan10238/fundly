import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import { deflateRawSync, inflateRawSync } from "node:zlib"
import type { DiosShareableReport } from "./types"

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

type Envelope = {
  exp: number
  report: DiosShareableReport
}

function secret() {
  const value = process.env.REPORT_SHARE_SECRET
  if (!value || value.length < 32) {
    throw new Error(
      "REPORT_SHARE_SECRET must be configured with at least 32 characters.",
    )
  }
  return value
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url")
}

export function createReportToken(
  report: DiosShareableReport,
  maxAgeSeconds = MAX_AGE_SECONDS,
) {
  const envelope: Envelope = {
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    report,
  }

  const compressed = deflateRawSync(
    Buffer.from(JSON.stringify(envelope), "utf8"),
    { level: 9 },
  ).toString("base64url")

  return `${compressed}.${sign(compressed)}`
}

export function readReportToken(token: string): DiosShareableReport {
  const [payload, signature] = token.split(".")
  if (!payload || !signature) throw new Error("Invalid report link")

  const expected = Buffer.from(sign(payload))
  const actual = Buffer.from(signature)

  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    throw new Error("Invalid report signature")
  }

  const envelope = JSON.parse(
    inflateRawSync(Buffer.from(payload, "base64url")).toString("utf8"),
  ) as Envelope

  if (!envelope.exp || envelope.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("This shared report link has expired")
  }

  return envelope.report
}
