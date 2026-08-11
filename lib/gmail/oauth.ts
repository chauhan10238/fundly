import { google } from "googleapis";
import { gmailConfig, GMAIL_SCOPE } from "./config";

export function createOAuthClient() {
  return new google.auth.OAuth2(
    gmailConfig.clientId,
    gmailConfig.clientSecret,
    gmailConfig.redirectUri,
  );
}

export function createGoogleAuthorizationUrl(state: string, loginHint?: string | null): string {
  const client = createOAuthClient();

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [GMAIL_SCOPE],
    state,
    ...(loginHint ? { login_hint: loginHint } : {}),
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getGoogleAccountEmail(accessToken: string): Promise<string> {
  const client = createOAuthClient();
  client.setCredentials({ access_token: accessToken });

  // Gmail profile works with gmail.readonly. The previous implementation called
  // Google OAuth userinfo, which requires an additional identity/email scope.
  const gmail = google.gmail({
    version: "v1",
    auth: client,
  });

  const response = await gmail.users.getProfile({
    userId: "me",
  });

  const email = response.data.emailAddress?.toLowerCase();

  if (!email) {
    throw new Error("Gmail account email was not returned");
  }

  return email;
}

export function createAuthenticatedOAuthClient(refreshToken: string) {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export function isGoogleInvalidGrant(error: unknown): boolean {
  const candidates = [
    error instanceof Error ? error.message : "",
    typeof error === "object" && error !== null ? JSON.stringify(error) : String(error ?? ""),
  ].join(" ").toLowerCase()
  return candidates.includes("invalid_grant") || candidates.includes("token has been expired or revoked") || candidates.includes("invalid grant")
}
