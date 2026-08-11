# Fundly DIOS v4.1 — FMP Starter

This package contains the DIOS investment portal only. NRI Property Connect pages and components have been removed.

## Included fixes

- Financial Modeling Prep is the primary provider for live quotes.
- FMP Starter is the primary provider for historical price charts.
- FMP TTM statements, ratios, key metrics and earnings feed the existing institutional analysis.
- Yahoo Finance remains a quote/history fallback so pages do not go blank.
- The visible provider label identifies FMP or Yahoo fallback.
- Stake Gmail Sync detects Google `invalid_grant`, clears stale cookies and shows Reconnect Gmail.

## Vercel configuration

Copy the values from `.env.example` into Vercel Project Settings → Environment Variables.

At minimum, market data requires:

```env
FMP_API_KEY=your_fmp_starter_key
```

Stake Sync additionally requires the Google variables shown in `.env.example`. The Google redirect URI must exactly match the URI registered in Google Cloud.

## Verification

1. Deploy to Vercel.
2. Open Analyse and run AAPL or NVDA.
3. The live-price text should say `Financial Modeling Prep (Primary)`.
4. The price chart footer should say `Source: Financial Modeling Prep (Starter)`.
5. Open Stake Sync. An invalid old Google token should result in `Reconnect Stake Gmail`, not a false connected state.
