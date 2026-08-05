import { NextRequest, NextResponse } from "next/server"
import { decryptToken } from "@/lib/gmail/crypto"
import { listParsedStakeTrades } from "@/lib/gmail/stake-trades"
import { isGoogleInvalidGrant } from "@/lib/gmail/oauth"
import { PROFILE_COOKIE_NAME, readProfileSession } from "@/lib/dios/profile-auth"
import { brokerCookieNames } from "@/lib/gmail/broker-context"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function clearGoogleCookies(response: NextResponse) {
  const names = brokerCookieNames("deepak", "stake")
  response.cookies.delete(names.refreshToken)
  response.cookies.delete(names.account)
  response.cookies.delete(names.oauthState)
  return response
}

export async function GET(request: NextRequest) {
  if (readProfileSession(request.cookies.get(PROFILE_COOKIE_NAME)?.value) !== "deepak") {
    return NextResponse.json({ error: "Stake Sync is not enabled for this profile." }, { status: 403 })
  }
  try {
    const encryptedToken = request.cookies.get(brokerCookieNames("deepak", "stake").refreshToken)?.value
    if (!encryptedToken) return NextResponse.json({ connected: false, reconnectRequired: false, trades: [] }, { status: 401 })
    const refreshToken = decryptToken(encryptedToken)
    const trades = await listParsedStakeTrades(refreshToken, 100)
    return NextResponse.json({ connected: true, reconnectRequired: false, scannedAt: new Date().toISOString(), count: trades.length, ready: trades.filter((t) => t.status === "Ready").length, needsReview: trades.filter((t) => t.status === "Needs Review").length, trades })
  } catch (error) {
    console.error("Stake trade parsing failed", error)
    if (isGoogleInvalidGrant(error)) {
      return clearGoogleCookies(NextResponse.json({ connected: false, reconnectRequired: true, error: "Your Google permission has expired or was revoked. Reconnect Stake Gmail to continue.", trades: [] }, { status: 401 }))
    }
    return NextResponse.json({ connected: true, reconnectRequired: false, error: error instanceof Error ? error.message : "Unable to parse Stake trade confirmations", trades: [] }, { status: 500 })
  }
}
