# Ticker navigation hard fix

This release restores the original interaction model:

- Suggestions appear while typing.
- Selecting a suggestion immediately opens that ticker.
- Enter and Search immediately open the typed ticker.
- Quick picks use real links and work without relying on the Next.js client router.
- The search input resets to the ticker currently shown in the URL.

The navigation deliberately uses a full browser navigation to avoid stale client-router state after Vercel deployments.
