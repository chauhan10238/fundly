# fundly

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_KfGqorqLzIJjQAtJoBWl55cRg4Wy)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

## Live portfolio prices

DIOS 1.2 retrieves current holding prices through a server-side route.

1. Create an FMP API key.
2. In Vercel, add `FMP_API_KEY` under Project Settings → Environment Variables.
3. Apply it to Production and Preview.
4. Redeploy the project.
5. Open Portfolio and select **Refresh prices**.

The API key is read only in `app/api/quotes/route.ts` and is never sent to the browser.
When a quote is unavailable, DIOS clearly labels the affected position as a demo fallback.
