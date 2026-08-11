# Fundly v2 — Recommendation Intelligence

## Included

- Recommendation History v2
- Investor decision states: Bought/Executed, Watching, Ignored, Already Own, Partially Executed
- Frozen AI snapshot captured when a new recommendation is logged
- Investor action timeline
- Automatic 1D, 1W, 1M, 3M, 6M and 12M measurements
- Exact milestone pricing from FMP historical EOD data, with Yahoo fallback
- Missed opportunity, loss avoided and ignored-warning classifications
- Fundly Accuracy and Followed Success
- AI Alpha versus SPY for recommendations created after this upgrade
- Confidence calibration
- Recommendation Quality score adjusted for evidence maturity
- Missed Opportunity $, Loss Avoided $ and Followed Value Impact
- AI version tracking

## Important behaviour

Existing legacy recommendations remain compatible. They may not have a frozen snapshot or SPY baseline because those values did not exist when the recommendation was created.

New recommendations store a SPY baseline, portfolio value, suggested notional, factor scores, sources, model/scoring versions and market-data provider at creation time.

Dollar figures use the recorded execution value when price and quantity are entered. Otherwise, they use the recommendation's stored tracking notional. They are analytical estimates, not audited realised P/L.

## Deployment test

1. Analyse a ticker and click Log Recommendation.
2. Open Recommendation History and confirm Fundly AI v2.0 appears in the snapshot.
3. Choose Watching, Ignored, Bought/Executed or Already Own and confirm the action appears in the timeline.
4. Confirm new recommendations show six milestone cards.
5. After a milestone becomes due, opening Recommendation History calls `/api/recommendations/measure` and stores the result.
6. Confirm Deepak and Suren retain separate recommendation histories.
