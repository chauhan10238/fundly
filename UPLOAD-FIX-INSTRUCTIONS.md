# Dependency repair

This archive fixes the Vercel `Module not found` build failure by restoring every package imported by the application.

## Upload

Replace the files in your GitHub repository with the contents of this archive, commit, and redeploy in Vercel.

Important repaired files:

- `package.json` — restored runtime and build dependencies
- `vercel.json` — tells Vercel to regenerate the pnpm lockfile during install
- stale `pnpm-lock.yaml` removed — Vercel will create a fresh lockfile

No application features or source logic were changed.
