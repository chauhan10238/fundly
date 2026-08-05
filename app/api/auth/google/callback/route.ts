import { NextRequest, NextResponse } from "next/server"
import { gmailConfig } from "@/lib/gmail/config"
import { encryptToken, verifyState } from "@/lib/gmail/crypto"
import { exchangeCodeForTokens, getGoogleAccountEmail } from "@/lib/gmail/oauth"
import { brokerCookieNames, brokerPath, type BrokerId } from "@/lib/gmail/broker-context"
import type { DiosProfile } from "@/lib/dios/profile-auth"

export const runtime = "nodejs"

type OAuthState = { nonce: string; profileId: DiosProfile["id"]; broker: BrokerId }

function decodeState(state: string): OAuthState | null {
  try {
    const value = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as Partial<OAuthState>
    if (!value.nonce || (value.profileId !== "deepak" && value.profileId !== "suren")) return null
    if (value.broker !== "stake" && value.broker !== "schwab") return null
    return value as OAuthState
  } catch { return null }
}

function redirectWithError(message: string, broker: BrokerId = "stake") {
  const url = new URL(brokerPath(broker), gmailConfig.appUrl)
  url.searchParams.set("error", message)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state")
  const context = state ? decodeState(state) : null
  const broker = context?.broker ?? "stake"
  try {
    const code = request.nextUrl.searchParams.get("code")
    const googleError = request.nextUrl.searchParams.get("error")
    const stateCookie = request.cookies.get("dios_google_oauth_state")?.value
    if (googleError) return redirectWithError(`Google authorization failed: ${googleError}`, broker)
    if (!code || !state || !stateCookie || !context) return redirectWithError("Missing or invalid OAuth callback information", broker)

    const separator = stateCookie.lastIndexOf(".")
    if (separator < 1) return redirectWithError("Invalid OAuth state cookie", broker)
    const storedState = stateCookie.slice(0, separator)
    const signature = stateCookie.slice(separator + 1)
    if (storedState !== state || !verifyState(storedState, signature)) return redirectWithError("OAuth state check failed", broker)

    if ((context.profileId === "deepak" && broker !== "stake") || (context.profileId === "suren" && broker !== "schwab")) {
      return redirectWithError("Broker/profile mismatch.", broker)
    }

    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.access_token) return redirectWithError("Google did not return an access token", broker)
    const accountEmail = await getGoogleAccountEmail(tokens.access_token)
    const expected = broker === "stake" ? gmailConfig.expectedAccount : gmailConfig.schwabExpectedAccount
    if (expected && accountEmail !== expected) return redirectWithError(`Please connect ${expected}, not ${accountEmail}`, broker)
    if (!tokens.refresh_token) return redirectWithError("Google did not return a refresh token. Revoke Fundly access in your Google Account and connect again.", broker)

    const response = NextResponse.redirect(new URL(`${brokerPath(broker)}?connected=1`, gmailConfig.appUrl))
    const names = brokerCookieNames(context.profileId, broker)
    response.cookies.set(names.refreshToken, encryptToken(tokens.refresh_token), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    })
    response.cookies.set(names.account, accountEmail, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    })
    response.cookies.delete(names.oauthState)
    return response
  } catch (error) {
    console.error("Google OAuth callback failed", error)
    return redirectWithError(error instanceof Error ? error.message : "Unknown OAuth error", broker)
  }
}
