import { NextRequest, NextResponse } from "next/server";
import { gmailConfig } from "@/lib/gmail/config";
import { encryptToken, verifyState } from "@/lib/gmail/crypto";
import {
  exchangeCodeForTokens,
  getGoogleAccountEmail,
} from "@/lib/gmail/oauth";

export const runtime = "nodejs";

function redirectWithError(message: string) {
  const url = new URL("/stake-sync", gmailConfig.appUrl);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const googleError = request.nextUrl.searchParams.get("error");
    const stateCookie = request.cookies.get("dios_google_oauth_state")?.value;

    if (googleError) {
      return redirectWithError(`Google authorization failed: ${googleError}`);
    }

    if (!code || !state || !stateCookie) {
      return redirectWithError("Missing OAuth callback information");
    }

    const separator = stateCookie.lastIndexOf(".");
    if (separator < 1) {
      return redirectWithError("Invalid OAuth state cookie");
    }

    const storedState = stateCookie.slice(0, separator);
    const signature = stateCookie.slice(separator + 1);

    if (storedState !== state || !verifyState(storedState, signature)) {
      return redirectWithError("OAuth state check failed");
    }

    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      return redirectWithError("Google did not return an access token");
    }

    const accountEmail = await getGoogleAccountEmail(tokens.access_token);

    if (accountEmail !== gmailConfig.expectedAccount) {
      return redirectWithError(
        `Please connect ${gmailConfig.expectedAccount}, not ${accountEmail}`,
      );
    }

    if (!tokens.refresh_token) {
      return redirectWithError(
        "Google did not return a refresh token. Revoke DIOS access in your Google Account and connect again.",
      );
    }

    const response = NextResponse.redirect(
      new URL("/stake-sync?connected=1", gmailConfig.appUrl),
    );

    response.cookies.set(
      "dios_google_refresh_token",
      encryptToken(tokens.refresh_token),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );

    response.cookies.set("dios_google_account", accountEmail, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.delete("dios_google_oauth_state");

    return response;
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return redirectWithError(
      error instanceof Error ? error.message : "Unknown OAuth error",
    );
  }
}
