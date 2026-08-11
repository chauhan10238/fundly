# Recommendation History — Investor Decision Workflow

## What changed

Recommendation History now separates **Fundly's market call** from the **investor's decision**.

A new recommendation starts as **Awaiting Decision**. It is never automatically treated as ignored.

The investor can mark it as:

- **Bought / Executed** — the recommendation was acted on.
- **Watching** — it is being monitored but no trade has been made.
- **Ignored** — the investor deliberately chose not to act.
- **Already Own** — the recommendation applies to an existing holding.
- **Partially Executed** — only part of the recommendation was acted on.

Execution price, quantity and decision notes can be recorded for followed recommendations.

## Performance logic

Fundly continues to measure the market outcome of every recommendation at the existing horizons (1 day, 1 week, 1 month, 3 months, 6 months and 12 months).

- **Fundly accuracy** includes every measured recommendation, regardless of investor action.
- **Followed performance** includes only Executed, Partially Executed and Already Own decisions.
- **Ignored outcomes** are described as missed opportunities, avoided losses, missed protection or good decisions to ignore.
- **Watching** and **Awaiting Decision** remain tracking states and are not counted as ignored.

## Backward compatibility

Older records with status `Pending` are displayed as `Awaiting Decision` without requiring a data migration.
