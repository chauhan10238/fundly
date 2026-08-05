import { NextRequest, NextResponse } from "next/server"
import { decryptToken } from "@/lib/gmail/crypto"
import { listStakeEmails } from "@/lib/gmail/stake"
import { isGoogleInvalidGrant } from "@/lib/gmail/oauth"
import { PROFILE_COOKIE_NAME, readProfileSession } from "@/lib/dios/profile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function clearGoogleCookies(response: NextResponse) {
  response.cookies.delete("dios_google_refresh_token")
  response.cookies.delete("dios_google_account")
  response.cookies.delete("dios_google_oauth_state")
  return response
}

export async function GET(request: NextRequest) {
  if (readProfileSession(request.cookies.get(PROFILE_COOKIE_NAME)?.value) !== "deepak") {
    return NextResponse.json({ error: "Stake Sync is not enabled for this profile." }, { status: 403 })
  }
  try {
    const encryptedToken = request.cookies.get("dios_google_refresh_token")?.value
    if (!encryptedToken) return NextResponse.json({ connected: false, reconnectRequired: false, emails: [] }, { status: 401 })
    const refreshToken = decryptToken(encryptedToken)
    const emails = await listStakeEmails(refreshToken, 50)
    return NextResponse.json({ connected: true, reconnectRequired: false, scannedAt: new Date().toISOString(), count: emails.length, emails })
  } catch (error) {
    console.error("Stake Gmail scan failed", error)
    if (isGoogleInvalidGrant(error)) {
      return clearGoogleCookies(NextResponse.json({ connected: false, reconnectRequired: true, error: "Your Google permission has expired or was revoked. Reconnect Stake Gmail to continue.", emails: [] }, { status: 401 }))
    }
    return NextResponse.json({ connected: true, reconnectRequired: false, error: error instanceof Error ? error.message : "Unable to scan Stake emails", emails: [] }, { status: 500 })
  }
}
