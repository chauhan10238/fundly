DIOS v1.5 COMPLETE STAKE GMAIL PATCH
====================================

This ZIP contains every file required for the current Stake Gmail Phase 1 build.

IMPORTANT
---------
Do NOT delete your existing app or lib folders.
Merge the included folders into the existing fundly repository.

COPY THESE ITEMS INTO THE ROOT OF fundly
----------------------------------------
1. app/
2. lib/
3. package.json
4. eslint.config.mjs

Windows may ask whether to merge app and lib folders. Choose Yes.
This adds new subfolders only.

EXPECTED NEW FILES
------------------
app/api/auth/google/route.ts
app/api/auth/google/callback/route.ts
app/api/auth/google/disconnect/route.ts
app/api/stake/emails/route.ts
app/stake-sync/page.tsx
app/stake-sync/StakeSyncClient.tsx

lib/gmail/config.ts
lib/gmail/crypto.ts
lib/gmail/oauth.ts
lib/gmail/stake.ts

ROOT FILES
----------
package.json
eslint.config.mjs

LOCK FILE
---------
If pnpm-lock.yaml still exists and you cannot run pnpm locally, delete pnpm-lock.yaml
before committing. Vercel will install from package.json using npm.

VERCEL ENVIRONMENT VARIABLES
----------------------------
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
EXPECTED_GOOGLE_ACCOUNT
STAKE_EMAIL
NEXT_PUBLIC_APP_URL
OAUTH_STATE_SECRET
TOKEN_ENCRYPTION_KEY

Recommended values:
GOOGLE_REDIRECT_URI=https://fundly-lime.vercel.app/api/auth/google/callback
EXPECTED_GOOGLE_ACCOUNT=chauhan.dan@gmail.com
STAKE_EMAIL=notifications@hellostake.com
NEXT_PUBLIC_APP_URL=https://fundly-lime.vercel.app

GITHUB DESKTOP
--------------
Commit message:
fix: add complete DIOS v1.5 Stake Gmail patch

Push origin and allow Vercel to create a fresh deployment.

TEST URL
--------
https://fundly-lime.vercel.app/stake-sync

PHASE 1 BEHAVIOUR
-----------------
Read-only Gmail access.
Finds Stake emails from notifications@hellostake.com.
Does not import or change holdings yet.
