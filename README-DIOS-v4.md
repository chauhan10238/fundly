# DIOS v4 — Unified Daily Intelligence

## Fixed

- Daily Brief no longer depends on the mismatched server response shape that caused empty holdings, empty sources and empty ETF opportunities.
- Daily Brief now uses the same `fetchLiveAnalysisReport` engine as Daily Scan.
- “Data insufficient” has been removed as a directional outcome.
- Direction is always Bullish, Neutral or Bearish; Data Quality is a separate percentage.
- Unheld ETF opportunities are ranked every day instead of being hidden behind an all-or-nothing bullish gate.
- ETF discovery universe expanded to 45 diversified ETFs.
- Provider requests are concurrency-limited to reduce Vercel/browser overload.

## New shared module

`lib/dios/intelligence-view.ts`

This module owns:

- source-family normalization
- 12-check Data Quality score
- Bullish/Neutral/Bearish classification
- directional probability
- ETF ranking score

Both Daily Brief and Daily Scan now consume it.

## Deployment

Copy this project over the current Fundly project, preserve your real environment variables in Vercel, then deploy.

The old `/api/daily-brief` route remains for compatibility, but the visible Daily Brief page now builds directly from the proven shared live-analysis engine. A dedicated server-side automation endpoint should be completed with the paid API phase so the 7 AM scheduled brief can run without a browser session.
