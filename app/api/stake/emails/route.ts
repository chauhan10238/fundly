import { NextRequest, NextResponse } from "next/server";
import { decryptToken } from "@/lib/gmail/crypto";
import { isGoogleInvalidGrant } from "@/lib/gmail/oauth";
import { listStakeEmails } from "@/lib/gmail/stake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const encryptedToken = request.cookies.get(
      "dios_google_refresh_token",
    )?.value;

    if (!encryptedToken) {
      return NextResponse.json(
        { connected: false, emails: [] },
        { status: 401 },
      );
    }

    const refreshToken = decryptToken(encryptedToken);
    const emails = await listStakeEmails(refreshToken, 50);

    return NextResponse.json({
      connected: true,
      scannedAt: new Date().toISOString(),
      count: emails.length,
      emails,
    });
  } catch (error) {
    if (isGoogleInvalidGrant(error)) {
      const response = NextResponse.json(
        { connected: false, reconnectRequired: true, error: "Google access expired or was revoked. Click Reconnect Gmail to authorise Stake Sync again.", emails: [] },
        { status: 401 },
      );
      response.cookies.delete("dios_google_refresh_token");
      response.cookies.delete("dios_google_account");
      return response;
    }

    console.error("Stake Gmail scan failed", error);

    return NextResponse.json(
      {
        connected: true,
        error:
          error instanceof Error
            ? error.message
            : "Unable to scan Stake emails",
        emails: [],
      },
      { status: 500 },
    );
  }
}
