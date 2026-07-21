# DIOS GitHub Cloud v2

Replace these two files:

- `app/api/store/route.ts`
- `components/dios/store.tsx`

This version fixes cross-browser divergence by:

- refusing to auto-save until the first cloud read succeeds;
- preventing a cloud refresh from being written straight back;
- tracking the GitHub file SHA;
- rejecting stale writes from an older browser;
- reloading the newest cloud data when a conflict occurs;
- bypassing browser and CDN cache on cloud reads.

After committing, redeploy Vercel and hard-refresh both browsers.

Also verify that `GITHUB_BRANCH` points to an existing branch.
