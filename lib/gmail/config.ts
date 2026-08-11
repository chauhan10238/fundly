const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const gmailConfig = {
  clientId: required("GOOGLE_CLIENT_ID"),
  clientSecret: required("GOOGLE_CLIENT_SECRET"),
  redirectUri: required("GOOGLE_REDIRECT_URI"),
  expectedAccount: required("EXPECTED_GOOGLE_ACCOUNT").toLowerCase(),
  schwabExpectedAccount: process.env.SCHWAB_EXPECTED_GOOGLE_ACCOUNT?.trim().toLowerCase() || null,
  stakeEmail: process.env.STAKE_EMAIL?.toLowerCase() ?? "notifications@hellostake.com",
  appUrl: required("NEXT_PUBLIC_APP_URL"),
  stateSecret: required("OAUTH_STATE_SECRET"),
  tokenEncryptionKey: required("TOKEN_ENCRYPTION_KEY"),
};

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
