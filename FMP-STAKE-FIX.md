# FMP Starter and Stake Sync fix

## Vercel environment variables

Add `FMP_API_KEY` to Production, Preview and Development. Keep the existing Google OAuth variables.

## Market data order

1. Financial Modeling Prep Starter is the primary source for quotes and price history.
2. Yahoo Finance is used only when FMP does not return usable data.
3. FMP fundamentals and earnings are used first; SEC EDGAR and Finnhub remain fallbacks/verification sources.

## Stake Sync

An expired or revoked Google refresh token now clears the stale connection cookies and shows **Reconnect Stake Gmail** instead of incorrectly displaying **Gmail connected**.
