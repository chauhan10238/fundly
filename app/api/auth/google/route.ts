import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createGoogleAuthorizationUrl } from "@/lib/gmail/oauth"
import { signState } from "@/lib/gmail/crypto"
import { gmailConfig } from "@/lib/gmail/config"
import { PROFILE_COOKIE_NAME, readProfileSession } from "@/lib/dios/profile-auth"
import { brokerCookieNames, brokerForProfile, type BrokerId } from "@/lib/gmail/broker-context"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const profileId = readProfileSession(request.cookies.get(PROFILE_COOKIE_NAME)?.value)
  if (!profileId) return NextResponse.json({ error: "Unlock a Fundly profile before connecting Gmail." }, { status: 401 })
  const requested = request.nextUrl.searchParams.get("broker") as BrokerId | null
  const broker = requested === "schwab" || requested === "stake" ? requested : brokerForProfile(profileId)

  if ((profileId === "deepak" && broker !== "stake") || (profileId === "suren" && broker !== "schwab")) {
    return NextResponse.json({ error: "This broker is not enabled for the active profile." }, { status: 403 })
  }

  const statePayload = {
    nonce: crypto.randomBytes(24).toString("base64url"),
    profileId,
    broker,
  }
  const state = Buffer.from(JSON.stringify(statePayload), "utf8").toString("base64url")
  const signature = signState(state)
  const loginHint = broker === "stake" ? gmailConfig.expectedAccount : gmailConfig.schwabExpectedAccount
  const response = NextResponse.redirect(createGoogleAuthorizationUrl(state, loginHint))
  const names = brokerCookieNames(profileId, broker)

  response.cookies.set(names.oauthState, `${state}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  })
  return response
}
