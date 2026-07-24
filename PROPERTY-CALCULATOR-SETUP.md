# Live Property Calculator Setup

Add these environment variables in Vercel and redeploy:

```env
APIFY_API_TOKEN=apify_api_your_personal_token
APIFY_99ACRES_ACTOR_ID=fatihtahta/99acres-scraper-ppe
APIFY_MAX_RESULTS=50
```

Important: the correct Actor owner is `fatihtahta`, not `fatihtat`.

The route calls Apify's synchronous Actor endpoint, retrieves live 99acres listings, filters by property type, bedrooms, area and furnishing, removes price-per-square-foot outliers, and returns an indicative estimate with comparable evidence and a confidence score.

The live call may take 20–60 seconds. The route sets `maxDuration = 300`, subject to your Vercel plan.
