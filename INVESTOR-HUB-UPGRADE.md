# Fundly Investor Hub upgrade

This build adds a profile-aware Investor Hub without adding a broker connection.

## Included

- Top 5 / top 10 concentration monitoring
- Largest-position exposure view
- Configurable broad-market and financial-sector stress testing
- FIFO tax-lot reconstruction from recorded transactions
- Per-holding decision journal with thesis, target weight, conviction, review date and sell rule
- Rules-based concentration, drawdown and governance alerts
- Journal data is saved in the same profile-isolated cloud store as holdings and transactions

## Important limitations

- Tax lots are reconstructed only from transactions recorded in Fundly. Confirm them against Schwab before tax use.
- Financial-sector stress exposure depends on available security metadata. Unclassified holdings can understate sector exposure.
- This release does not connect to Schwab and does not automatically import future transactions.
- Short positions, options and margin borrowing remain outside the current long-only portfolio engine.
