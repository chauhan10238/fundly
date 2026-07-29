# DIOS v3 — Weeks 2, 3 and 4

## Week 2: market, sector and event intelligence

Added:
- `lib/dios/market-intelligence.ts`
- `lib/dios/sector-intelligence.ts`
- `lib/dios/etf-knowledge.ts`
- `lib/dios/event-intelligence.ts`
- `app/api/intelligence/route.ts`

`GET /api/intelligence` now returns a market regime, volatility state, breadth proxy, known ETF driver confirmation and coverage metadata. ETF driver weights are a maintained knowledge layer, not a claim of real-time fund holdings. Refresh these records periodically from issuer data.

## Week 3: institutional scoring

Added:
- `lib/dios/institutional-scoring.ts`
- `lib/dios/intelligence-engine-v3.ts`

Default weights:
- Technical 20%
- Macro 15%
- Sector 15%
- ETF strength 15%
- News 10%
- Market regime 10%
- Portfolio fit 10%
- Volatility 5%

Missing signals are excluded and reported. Data quality reduces confidence and reliability; it does not produce a blank recommendation.

## Week 4: prediction learning and backtesting

Added:
- `lib/dios/prediction-learning.ts`
- `lib/dios/backtest.ts`
- `lib/dios/github-json-store.ts`
- `GET/POST /api/predictions`
- `POST /api/predictions/resolve`
- `POST /api/backtest`

Predictions are persisted to `data/dios-predictions.json` in the configured GitHub repository. The resolver obtains a current quote for due predictions, calculates realised return and marks directional correctness. Weight recalibration is deliberately conservative and requires at least 20 resolved observations.

## Required environment variables

Existing GitHub variables are reused:
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`

Optional:
- `FMP_API_KEY`

## Important deployment notes

1. Create `data/dios-predictions.json` with `[]`, or allow the API to create it on the first write.
2. Schedule `POST /api/predictions/resolve` daily after the US market close. An empty JSON body resolves all due records.
3. Do not turn on automatic weight replacement in production until at least 100–200 resolved predictions have been reviewed.
4. Backtesting requires point-in-time features. Do not use current ETF holdings or revised macro data for historical dates, because that introduces look-ahead bias.
5. This package does not add paid data dependencies. Options, yields, futures and economic-calendar feeds can be mapped into the institutional inputs later.
