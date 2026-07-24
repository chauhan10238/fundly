# NRI Property News & Knowledge Hub Update

This update is already integrated into the project.

## New capabilities

- Live news provider cascade: GNews first, then NewsAPI
- No-key curated fallback so the page never appears empty
- Trusted-source filtering for Indian finance and property publishers
- Automatic categories: Tax & TDS, FEMA & RBI, Sale, Investment, Rental, Legal, Infrastructure and Home Loans
- Automatic red highlighting for time-sensitive news
- Rule-based “Why it matters to NRIs” explanation
- Region tags such as Noida, Gurugram, Delhi NCR, Rajasthan and Uttarakhand
- Search and category filters in `/knowledge-hub`
- Trusted source directory
- Homepage news preview linking to the full Knowledge Hub

## Vercel environment variable

Add one of these under Project Settings → Environment Variables:

```text
GNEWS_API_KEY=your_key
```

or:

```text
NEWS_API_KEY=your_key
```

Then redeploy. API keys remain server-side in the route handler.

## Important

The site links to original publishers and displays short summaries only. It does not imply that NRI Property Connect is featured by or partnered with those publishers.
