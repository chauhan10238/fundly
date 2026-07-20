import { NextResponse } from "next/server";
import { gmailConfig } from "@/lib/gmail/config";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.redirect(
    new URL("/stake-sync?disconnected=1", gmailConfig.appUrl),
    { status: 303 },
  );

  response.cookies.delete("dios_google_refresh_token");
  response.cookies.delete("dios_google_account");
  response.cookies.delete("dios_google_oauth_state");

  return response;
}
