# Suren Clean Tracking Baseline

## Tracking start

Fundly treats **5 August 2026 (Australia/Sydney)** as Suren's clean tracking start date.

## Recommendation History

- Recommendation records before the tracking start are removed from Suren's cloud profile during the first successful load/save after deployment.
- Seed/demo records are excluded even if they are copied into a profile accidentally.
- Only recommendations genuinely logged from the Analyse page from the tracking start onward count toward:
  - Fundly Accuracy
  - Followed Success
  - Ignored Decision Quality
  - Confidence Calibration
  - Missed Opportunities
  - Losses Avoided
  - AI Scorecard
- Deepak's recommendation data is unchanged.

## Existing holdings baseline

- Fundly reconstructs Suren's holdings as of 5 August 2026 from transactions dated on or before that date.
- The opening ticker list and quantities are frozen on the first baseline run. New positions bought later are not incorrectly backdated to 5 August.
- Each opening holding receives a verified historical closing price for 5 August 2026.
- Financial Modeling Prep Starter is primary; Yahoo Finance is fallback.
- The baseline is stored separately from AI recommendations and never changes Fundly Accuracy.
- Existing holdings are measured after 1 day, 1 week, 1 month, 3 months, 6 months and 12 months.

## Investor Hub

Suren receives a new **Since 5 Aug** tab showing:

- baseline coverage
- opening portfolio value
- baseline cohort value at current prices
- return since tracking began
- holding-by-holding baseline and milestone returns
- data provider used for each baseline

## Migration safety

The migration is idempotent:

- old recommendations are filtered repeatedly without affecting eligible records
- baseline IDs are deterministic (`baseline-2026-08-05-TICKER`)
- missing baseline prices can be retried without duplicating existing baselines
- the opening ticker list is frozen, so future buys are not added to the historical baseline

## Deployment test

1. Deploy to a Preview branch.
2. Log in as Suren.
3. Open Recommendation History and confirm no records before 5 August 2026 appear.
4. Confirm the AI Scorecard counts only genuine recommendations from that date onward.
5. Open Investor Hub → Since 5 Aug.
6. Wait for baseline coverage to build; use **Refresh tracking** if some providers temporarily fail.
7. Confirm opening quantity, baseline close and source for a sample of large holdings.
8. Confirm Deepak's profile and Recommendation History remain unchanged.
