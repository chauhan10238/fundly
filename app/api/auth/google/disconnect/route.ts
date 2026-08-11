import { NextRequest, NextResponse } from "next/server"
import { gmailConfig } from "@/lib/gmail/config"
import { PROFILE_COOKIE_NAME, readProfileSession } from "@/lib/dios/profile-auth"
import { brokerCookieNames, brokerForProfile, brokerPath, type BrokerId } from "@/lib/gmail/broker-context"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const profileId = readProfileSession(request.cookies.get(PROFILE_COOKIE_NAME)?.value)
  if (!profileId) return NextResponse.json({ error: "Fundly profile is locked." }, { status: 401 })
  const form = await request.formData().catch(() => null)
  const requested = form?.get("broker") as BrokerId | null
  const broker = requested === "stake" || requested === "schwab" ? requested : brokerForProfile(profileId)
  const response = NextResponse.redirect(new URL(`${brokerPath(broker)}?disconnected=1`, gmailConfig.appUrl), { status: 303 })
  const names = brokerCookieNames(profileId, broker)
  response.cookies.delete(names.refreshToken)
  response.cookies.delete(names.account)
  response.cookies.delete(names.oauthState)
  return response
}
