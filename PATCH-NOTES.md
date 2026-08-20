# Fundly live-price/session consistency fix

## Root cause confirmed

Fundly had two separate market-price paths:

1. `resolveLiveQuote()` preferred FMP `stable/quote`, which can reflect the regular-session/latest FMP quote and does not reliably match Stake's extended-hours display.
2. The Analyse chart used `/api/history` independently. Its short-range Yahoo fallback explicitly set `includePrePost=false`, so after-hours prices were excluded.
3. The chart UI incorrectly mapped API interval values `5m`, `15m`, `1h`, and `1wk`, causing a 1D 5-minute chart to be labelled `daily data`.

This explains cases such as Stake showing VOO around $708.03 after hours while Fundly showed about $706.95.

## Changes

### lib/dios/server-market.ts
- Prefer Yahoo intraday with `includePrePost=true` for the canonical live price.
- Use FMP as fallback for the quote.
- FMP remains available for fundamentals/intelligence elsewhere.
- This also reduces FMP quote usage.

### app/api/history/route.ts
- 1D and 5D charts now prefer Yahoo extended-hours history.
- `includePrePost=true` for 1D/5D.
- FMP is fallback for short ranges.
- Longer ranges remain FMP-first with Yahoo fallback.

### components/dios/stock-price-chart.tsx
- Correct interval labels for `5m`, `15m`, `1h`, `1wk`.
- Clarify that the displayed value is the latest chart point/range move and show the provider.

## Expected result

Portfolio, Analyse, Daily Scan and Daily Brief all consume the same `resolveLiveQuote()` path, so their current-price basis should now be session-aware and much closer to Stake during pre-market/after-hours trading.

A few cents of difference can still occur because brokers and public market-data feeds can have different timestamps, aggregation and venues. A difference around the full after-hours move should no longer occur simply because Fundly ignored the extended session.
