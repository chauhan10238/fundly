# DIOS v3 — Week 1 implementation

This package contains the Week 1 foundation for the unified DIOS intelligence experience.

## Implemented

- Shared ETF universe in `lib/dios/etf-universe.ts`
  - 100+ diversified ETFs
  - one source for Daily Scan and Daily Brief
  - smaller server-safe subset for the current Vercel execution model
- Expanded shared intelligence view in `lib/dios/intelligence-view.ts`
  - Bullish / Neutral / Bearish always returned
  - separate Data Quality, Probability and Reliability
  - Today, 1–3 day and 1–4 week horizon views
  - Low / Medium / High risk classification
  - common opportunity ranking formula
- Daily Scan now consumes the shared ETF universe and shared intelligence model
- Daily Brief API now consumes the same shared ETF universe
- Removed the old duplicated ETF lists from Daily Scan and Daily Brief API

## Important architecture rule

Pages should not create their own recommendation logic. The canonical path is:

`/api/analysis` → `fetchLiveAnalysisReport()` → `buildIntelligenceView()`

This keeps Dashboard, Portfolio, Daily Scan and Daily Brief aligned.

## Build verification

The uploaded archive did not contain `node_modules`. Source-level checks were performed, but a full `next build` requires installing the dependencies represented by `pnpm-lock.yaml`.

Run locally:

```bash
pnpm install
pnpm build
```

## Week 2 hand-off

The next step is to add:

- market regime service
- event calendar intelligence
- cached ETF driver/holdings knowledge base
- sector confirmation engine
- 7 AM brief generation
