# Fundly v2 — Deepak PIN and Schwab Gmail Sync

## Profile PINs
- Deepak: 5818
- Suren: 1023

PINs are verified using SHA-256 hashes in `lib/dios/profile-auth.ts`; plain-text PINs are not stored.

## Profile-specific brokers
- Deepak: Stake Sync
- Suren: Schwab Sync

Google refresh tokens use separate HTTP-only cookies per profile and broker.

## Schwab parser status
The Schwab parser is intentionally generic until real confirmation samples are available. It supports common wording for BUY/SELL, symbol, quantity, execution price, fees and date. Incomplete messages are shown as `Needs Review` and cannot be imported.

## Environment variable
Optional:
`SCHWAB_EXPECTED_GOOGLE_ACCOUNT=suren@example.com`

After real Schwab buy and sell samples are provided, update `lib/gmail/schwab-trades.ts` with exact patterns and regression fixtures.
