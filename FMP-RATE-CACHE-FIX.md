# Fundly FMP Rate & Cache Fix

This release is designed for the Financial Modeling Prep Starter plan (300 calls/minute).

## Cache policy

- Live quotes / batch quotes: 30 seconds
- Ticker search: 5 minutes
- Historical prices: 6 hours
- Company profile: 24 hours
- Financial statements / ratios / metrics: 6 hours
- Analyst / ratings / estimates: 1 hour
- Earnings: 1 hour
- News: 10 minutes
- ETF / ownership / institutional data: 6 hours

## Protection

- Shared in-process cache and in-flight request de-duplication across profiles in a warm Fundly server instance.
- Next/Vercel Data Cache is enabled for FMP GET requests so repeated requests can be reused across serverless invocations.
- Internal FMP guard is set below the Starter 300 calls/minute ceiling (190 calls/minute per warm instance).
- Maximum two concurrent uncached FMP requests per warm instance.
- Quotes use FMP batch quote where possible.
- Search no longer performs a second FMP quote lookup for every typed prefix.
- Market tape and portfolio quote polling now run every 30 seconds.
- API responses advertise 30-second quote caching and 5-minute search caching.
- Yahoo Finance remains fallback when FMP is unavailable or the internal guard activates.

## Important

If an FMP key was exposed in a screenshot, rotate it in the FMP dashboard and update `FMP_API_KEY` in Vercel Production and Preview environments.
