# Changelog

## 1.3.1 — Live News & Fresh Sources

- Replaced illustrative dated citations with analysis-time sources.
- Added current ticker news through Financial Modeling Prep.
- Added recent geopolitical and war-risk coverage through GDELT.
- Added live earnings-calendar context for stocks.
- Added current company profile context and ETF holdings where available.
- Added graceful warnings when an endpoint is unavailable on the active API plan.
- Updated analysis reasons and recent-changes sections to use the latest returned observations.


## DIOS 1.1.0 — Personal Portfolio Foundation

- Replaced fabricated demo holdings with the current Stake snapshot: VT, GLD, MLPX, TSM, AMD and INTC.
- Removed fabricated seed transactions.
- Added browser-local persistence for holdings, cash, transactions, settings and recommendations.
- Added a reset-to-starting-snapshot action.
- Added explicit warnings that average costs and market prices require verification/live APIs.
- Normalised tickers and improved fractional-share handling.

## DIOS 1.2.0 — Live Portfolio Prices

- Added a secure server-side Financial Modeling Prep quote route.
- Added automatic live quote retrieval for current holdings.
- Added live total portfolio value, daily movement and unrealised P/L calculations.
- Added a manual Refresh prices action and configurable timed refresh.
- Added live, partial and fallback market-data status indicators.
- Preserved demo fallback prices when a ticker is temporarily unavailable.
- Removed the duplicate semiconductor concentration card.
- Kept the FMP API key server-side through `FMP_API_KEY`.

## DIOS 1.3.0 — Live Analyse Decision Engine

- Added `/api/analysis` for secure live quote retrieval on the Analyse page.
- Connected analysis reports to current FMP prices, daily movement and timestamps.
- Added a high-signal decision summary with the three strongest reasons, main risk and decision-change condition.
- Enforced portfolio rules for single-stock exposure above 10%, sector exposure above 35% and leveraged ETF exposure above 3%.
- Removed buy recommendations based solely on a falling price; quality, fundamentals, valuation and portfolio fit must also pass.
- Added concentration alerts and live/fallback market-data labels.
- Added manual analysis refresh and resilient fallback behaviour when live quotes are unavailable.
