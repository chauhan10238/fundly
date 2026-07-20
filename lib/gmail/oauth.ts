import { google } from "googleapis";
import { gmailConfig, GMAIL_SCOPE } from "./config";

export function createOAuthClient() {
  return new google.auth.OAuth2(
    gmailConfig.clientId,
    gmailConfig.clientSecret,
    gmailConfig.redirectUri,
  );
}

export function createGoogleAuthorizationUrl(state: string): string {
  const client = createOAuthClient();

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [GMAIL_SCOPE],
    state,
    login_hint: gmailConfig.expectedAccount,
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

  const oauth2 = google.oauth2({
    version: "v2",
    auth: client,
  });

  const response = await oauth2.userinfo.get();
  const email = response.data.email?.toLowerCase();

  if (!email) {
    throw new Error("Google account email was not returned");
  }

  return email;
}

export function createAuthenticatedOAuthClient(refreshToken: string) {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
