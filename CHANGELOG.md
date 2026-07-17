# Changelog

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
