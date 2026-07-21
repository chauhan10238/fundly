# DIOS Vercel Blob persistence

## Files

Copy these files into your project:

- `app/api/store/route.ts`
- `components/dios/store.tsx`

## Install

```bash
npm install @vercel/blob@latest
```

Private Blob stores require `@vercel/blob` 2.3 or newer.

## Vercel setup

1. Open the DIOS project in Vercel.
2. Open **Storage**.
3. Select **Create Database** and choose **Blob**.
4. Create a **Private** Blob store.
5. Connect it to the DIOS project and enable it for Production, Preview, and Development as required.
6. Confirm Vercel created `BLOB_READ_WRITE_TOKEN`.
7. Redeploy the project.

## Behaviour

- The browser loads the portfolio from `/api/store`.
- The store is saved to `dios/portfolio-store.json`.
- Changes are saved 1.5 seconds after the last update.
- Returning to the tab or focusing the browser reloads the latest remote state.
- No portfolio data is read from or written to `localStorage`.
- The first browser with existing Stake data must run Stake Sync once after this change. That data is then saved remotely and becomes available on every machine.

## Security

The API route contains portfolio information and permits updates. Protect the DIOS deployment with Vercel Authentication/Deployment Protection or your own application login before using it on a public production URL.
