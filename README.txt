FUNDLY UI / TAILWIND FIX

Copy and replace these files in the root of your GitHub repository:

1. app/globals.css
2. app/layout.tsx
3. package.json
4. postcss.config.mjs
5. vercel.json

Important:
- globals.css now starts with: @import "tailwindcss";
- postcss.config.mjs uses the Tailwind v4 PostCSS plugin.
- vercel.json forces pnpm to refresh the dependency installation without a frozen lockfile.
- Keep your existing components/dios/store.tsx provider file.

After committing these replacements, redeploy on Vercel.
