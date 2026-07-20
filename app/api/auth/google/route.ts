import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createGoogleAuthorizationUrl } from "@/lib/gmail/oauth";
import { signState } from "@/lib/gmail/crypto";

export const runtime = "nodejs";

export async function GET() {
  const state = crypto.randomBytes(32).toString("base64url");
  const signature = signState(state);
  const response = NextResponse.redirect(createGoogleAuthorizationUrl(state));

  response.cookies.set("dios_google_oauth_state", `${state}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}
