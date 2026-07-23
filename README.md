# DIOS Risk-Calibrated Intelligence Fix

Replace/add these files:

- lib/dios/decision-calibration.ts   (new)
- lib/dios/live-analysis.ts
- app/scan/page.tsx
- app/daily-brief/page.tsx

What changed

1. A 72/100 model score can no longer become a confident Buy merely from static hints or one feed.
2. Buy recommendations are downgraded when:
   - fewer than 2–3 independent source families are available;
   - the quote is not independently verified;
   - earnings are within three days;
   - the security has already moved 4%–7% in the session;
   - negative headlines materially outnumber positive headlines;
   - DIOS is using fallback/static data.
3. Daily Market Scan now runs the same live analysis engine as Analyse and Daily Brief.
4. It covers current holdings plus unheld ETF candidates.
5. Each card shows current move, 1–2 day directional bias, calibrated confidence,
   main risk, and source-family count.
6. “No trade” is shown when no opportunity survives the quality gates.

Important

This reduces false confidence but cannot make next-day market forecasts reliable.
Short-horizon recommendations remain uncertain and should not be treated as guaranteed returns.

Existing providers used by the project:
- Yahoo Finance: primary intraday quote and supplementary news
- Alpha Vantage: quote verification and news when configured
- Finnhub: news and earnings calendar when configured
- SEC EDGAR: filings and company facts for US stocks
- Financial Modeling Prep: quote fallback when configured

Recommended Vercel environment variables:
- FMP_API_KEY
- ALPHA_VANTAGE_API_KEY
- FINNHUB_API_KEY
- SEC_USER_AGENT

After deployment

1. Open Daily Market Scan and click Refresh scan.
2. Check GOOG. The decision should now be downgraded when source coverage,
   volatility, or event risk is insufficient.
3. Open Daily Brief and refresh it.
4. Confirm that the same score/recommendation appears in Analyse, Daily Brief,
   and Daily Market Scan.
