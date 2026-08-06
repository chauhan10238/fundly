# Fundly Core Hotfix

This release fixes three production issues:

1. FMP key resolution now accepts `FMP_API_KEY`, `FMP_KEY`, `FINANCIAL_MODELING_PREP_API_KEY`, or `FINANCIALMODELINGPREP_API_KEY`.
2. Ticker search runs FMP and Yahoo in parallel and falls back to Fundly's verified local instrument list.
3. Portfolio autosave no longer creates a Git commit when data is unchanged. Vercel also skips builds for data-only commits.

## Required Vercel setting
Keep one FMP key variable, preferably `FMP_API_KEY`, enabled for Production, Preview, and Development. Redeploy after saving it.
