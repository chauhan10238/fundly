# All-profile clean tracking

## Behaviour

- Deepak and Suren both start clean tracking on 5 August 2026 (Australia/Sydney).
- Demo/seed recommendations and recommendations before the profile tracking start are excluded and removed during profile-store migration.
- Existing holdings are baselined separately from AI recommendations using verified historical closes (FMP primary, Yahoo fallback).
- Existing-holding performance never affects Fundly Accuracy.
- Any profile added later automatically receives its own tracking start date on first use. That date is persisted in the profile store and used for both recommendation eligibility and the opening-holdings baseline.
- The migration is idempotent and cannot duplicate holding baselines.

## Verification

1. Open Deepak and confirm Recommendation History contains only genuine records from 5 Aug 2026 onward.
2. Open Investor Hub > Since tracking start and confirm Deepak baselines begin building.
3. Repeat for Suren.
4. Confirm the AI Scorecard excludes existing-holding baseline performance.
5. For a newly added profile, confirm tracking starts on the profile's first-use date.
