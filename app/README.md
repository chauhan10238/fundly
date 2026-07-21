# DIOS GitHub Cloud Storage v1

This replacement uses the GitHub REST API directly, so it requires **no npm package**.

## Replace these files

1. Replace:

   `components/dios/store.tsx`

2. Replace:

   `app/api/store/route.ts`

3. Optional: add the supplied starter file:

   `data/portfolio.json`

The API route will create `data/portfolio.json` automatically if it does not exist.

## Required Vercel environment variables

- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`

Example:

- `GITHUB_OWNER=chauhan10238`
- `GITHUB_REPO=fundly`
- `GITHUB_BRANCH=main`

The token needs repository **Contents: Read and write** permission.

## Important branch note

`GITHUB_BRANCH` must already exist.

If you entered `dios-data` but have not created that branch, either:

- create the `dios-data` branch in GitHub first, or
- temporarily change `GITHUB_BRANCH` to `main`.

Using `main` will work immediately, but each portfolio save creates a commit and may trigger a Vercel deployment. A separate `dios-data` branch avoids that.

## Remove the Blob dependency

The new files do not import `@vercel/blob`.

You may leave the old dependency in `package.json` temporarily; it will not be used. You can remove it later through GitHub's web editor if desired.

## Deploy

Commit the two replacement files (and optionally the starter JSON) through GitHub. Vercel should redeploy automatically.

After deployment:

1. Open DIOS.
2. Change or import one portfolio item.
3. Wait about 2 seconds.
4. Check the configured GitHub branch for `data/portfolio.json`.
5. Open DIOS in another browser and verify the same data appears.
