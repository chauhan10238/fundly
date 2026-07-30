# Fundly v4 — FMP Starter + Stake Sync Fix

## Vercel variables
Keep/add `FMP_API_KEY` with your FMP Starter key. Do not use `NEXT_PUBLIC_FMP_API_KEY`.

Stake Sync also requires: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `EXPECTED_GOOGLE_ACCOUNT`, `NEXT_PUBLIC_APP_URL`, `OAUTH_STATE_SECRET`, and `TOKEN_ENCRYPTION_KEY`.

`GOOGLE_REDIRECT_URI` must exactly equal: `https://YOUR-LIVE-DOMAIN/api/auth/google/callback` and the same URI must be registered in Google Cloud OAuth credentials.

## What changes
- Current quotes: FMP first, Yahoo fallback.
- Price-history chart: FMP Starter first; source is shown below the chart.
- Institutional Intelligence: FMP TTM income, balance sheet, cash flow, ratios and key metrics are preferred; SEC remains fallback/verification.
- Stake Sync: an expired/revoked Google refresh token no longer leaves a false “Gmail connected” state. The cookie is cleared and the screen shows “Reconnect Gmail”.

## One-time Stake repair
After deploying, open Stake Sync and click **Reconnect Gmail**. Google `invalid_grant` means the old refresh token is no longer valid, so it must be authorised again.
