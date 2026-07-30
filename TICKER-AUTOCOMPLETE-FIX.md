# Verified ticker autocomplete fix

This build removes the hard-coded demo-universe restriction from the Add Holding flow.

## What changed

- Manual holding entry now searches Financial Modeling Prep Starter while the user types.
- Yahoo Finance is used only if FMP search returns no results or is unavailable.
- The user must select a verified search result before Save is enabled.
- Save performs a final live-quote verification.
- Verified instrument metadata is stored with holdings outside the original demo universe.
- Portfolio rendering can also construct an instrument from a live quote, so existing Stake imports such as KO are no longer hidden merely because the ticker is absent from `universe.ts`.

## Required environment variable

`FMP_API_KEY`

## Important

The uploaded project did not contain `node_modules`, so a full local production build could not be completed in the isolated environment. Deploy this to a preview branch first and confirm ticker search, KO display, manual save, refresh persistence, and Stake Sync before merging to production.
