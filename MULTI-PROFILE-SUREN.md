# Fundly multi-profile release

## Included

- Separate Deepak and Suren profiles.
- Suren is protected by PIN `1023` and receives a signed, HTTP-only 12-hour profile session.
- Five failed PIN attempts lock that client for five minutes.
- Suren has full access to his Dashboard, Portfolio, Transactions, Daily Brief, Daily Scan, Earnings, History and Settings.
- Portfolio data is isolated in `data/profiles/suren.json`; Deepak continues to use `data/portfolio.json`.
- 124 long equity positions from the Schwab statement dated 2 August 2026 are preloaded for Suren.
- Quote loading now supports up to 200 symbols with controlled concurrency.

## Deliberately excluded from the initial import

The statement contains nine short positions. The current DIOS portfolio engine only models long holdings, so these are documented in `SUREN-IMPORT-REPORT.md` rather than being incorrectly converted into long positions. The statement's negative margin/cash balance is also not loaded because the current cash engine is fixed at zero.

## Vercel variable

Add a long random value for:

```env
PROFILE_SESSION_SECRET=your-long-random-secret
```

Stake Sync remains admin-only in this release because its Google OAuth cookies are not yet isolated per investor profile.
