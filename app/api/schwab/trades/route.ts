import { NextRequest, NextResponse } from "next/server"
import { decryptToken } from "@/lib/gmail/crypto"
import { listParsedSchwabTrades } from "@/lib/gmail/schwab-trades"
import { isGoogleInvalidGrant } from "@/lib/gmail/oauth"
import { PROFILE_COOKIE_NAME, readProfileSession } from "@/lib/dios/profile-auth"
import { brokerCookieNames } from "@/lib/gmail/broker-context"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function clearCookies(response: NextResponse) {
  const names = brokerCookieNames("suren", "schwab")
  response.cookies.delete(names.refreshToken); response.cookies.delete(names.account); response.cookies.delete(names.oauthState)
  return response
}

export async function GET(request: NextRequest) {
  if (readProfileSession(request.cookies.get(PROFILE_COOKIE_NAME)?.value) !== "suren") return NextResponse.json({ error: "Schwab Sync is only enabled for Suren's profile." }, { status: 403 })
  try {
    const names = brokerCookieNames("suren", "schwab")
    const encrypted = request.cookies.get(names.refreshToken)?.value
    if (!encrypted) return NextResponse.json({ connected:false,reconnectRequired:false,trades:[] },{status:401})
    const trades = await listParsedSchwabTrades(decryptToken(encrypted),100)
    return NextResponse.json({connected:true,reconnectRequired:false,scannedAt:new Date().toISOString(),count:trades.length,ready:trades.filter(t=>t.status==="Ready").length,needsReview:trades.filter(t=>t.status==="Needs Review").length,trades})
  } catch(error) {
    console.error("Schwab trade parsing failed",error)
    if(isGoogleInvalidGrant(error)) return clearCookies(NextResponse.json({connected:false,reconnectRequired:true,error:"Your Google permission has expired or was revoked. Reconnect Schwab Gmail to continue.",trades:[]},{status:401}))
    return NextResponse.json({connected:true,reconnectRequired:false,error:error instanceof Error?error.message:"Unable to parse Schwab trade confirmations",trades:[]},{status:500})
  }
}
