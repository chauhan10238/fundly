# Fundly deployment-storm hotfix

## Root cause

`app/api/store/route.ts` persists profile runtime data through GitHub. Every profile save creates a data commit. Multiple open tabs were also auto-building and measuring holding baselines, producing many overlapping saves. Vercel treated each data commit as a new Preview deployment.

## Fixes

- Vercel ignore logic now skips any `[fundly-data]` commit immediately.
- The client store saves only when an explicit local mutation is pending.
- Autosave is coalesced for 2 seconds.
- Server equality uses stable key ordering, preventing semantically identical JSON from generating another commit.
- Existing-holding baseline creation and measurements are now started only from **Investor Hub → Refresh tracking**, not automatically from every open page/tab.
- The existing global FMP and ticker-search hotfixes remain unchanged.

## Expected behaviour

- Code commits continue to deploy normally.
- Portfolio/profile data saves may still appear in GitHub history while GitHub remains the persistence layer, but they are marked `[fundly-data]` and Vercel skips their builds.
- Opening many Fundly tabs no longer generates repeated portfolio-save commits.
- Use **Refresh tracking** in Investor Hub when you want to create or update baseline measurements.
