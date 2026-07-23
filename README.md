# DIOS Phase 1 — Daily Brief

Drop-in files:

- `app/api/daily-brief/route.ts`
- `app/daily-brief/page.tsx`
- `lib/dios/daily-brief-engine.ts`
- `lib/dios/daily-brief-types.ts`

Then apply the small navigation change described in `PATCH-app-shell.txt`.

## What this phase adds

- Live overnight market summary
- Explicit Nasdaq and S&P point/percentage data when returned by `/api/market-overview`
- Portfolio health, market alignment, diversification and risk scores
- Separate Today, 1–3 day and 1–4 week outlooks
- Data Quality percentage instead of “Data insufficient”
- ETF opportunity scan with honest quality gates
- Portfolio risks and an action list
- A JSON API that can later power the 7 AM ChatGPT brief

## API

`POST /api/daily-brief`

Body:

```json
{
  "holdings": [
    {
      "ticker": "GOOG",
      "weight": 12.5,
      "marketValue": 4500,
      "dayChangeValue": -80,
      "dayChangePct": -1.75
    }
  ]
}
```

## Important

The route calls your existing `/api/analysis` and `/api/market-overview` endpoints. It does not require a paid API yet.

The ETF scan is capped at 24 symbols in Phase 1 to reduce Vercel timeout risk. After FMP Premium is connected, replace the per-symbol calls with batch endpoints and expand the scan to 100–150 ETFs.

## Build note

This package was prepared against the project files available in the conversation. Run:

```bash
pnpm run build
```

If your current `AnalysisReport` endpoint returns the report directly rather than under `report`, update the API adapter in `app/api/daily-brief/route.ts`. The supplied code expects the current richer response shape with `snapshot`, `context`, and `report`.
