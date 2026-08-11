# NRI City Investment Dashboards

This update adds a city-wise investment-research platform to the existing NRI Property Connect project.

## New routes

- `/investment-research`
- `/investment-research/noida`
- `/investment-research/gurugram`
- `/investment-research/lucknow`
- `/investment-research/jaipur`
- `/investment-research/chandigarh-tricity`
- `/investment-research/dehradun`
- `/investment-research/amritsar`

## Dashboard features

- NRI opportunity score
- Recommendation band
- Growth, rental, liquidity and risk indicators
- Demand drivers
- Micro-market/corridor comparisons
- Property-type suitability
- NRI due-diligence checklist
- City-filtered live news tab
- Official and professional research-source links
- Mobile-responsive design

## Knowledge Hub integration

The Knowledge Hub now includes a city-research preview with direct links to each dashboard.

## Main navigation

The homepage menu now includes `City Research`.

## Live city news

The existing `/api/property-news` route now supports a `q` query parameter. Each dashboard uses city-specific search terms when GNews or NewsAPI is configured.

## Environment variables

Use either:

```env
GNEWS_API_KEY=your_key
```

or:

```env
NEWS_API_KEY=your_key
```

Without a key, the existing curated fallback news remains available.

## Data notice

City scores and market signals are screening tools and qualitative editorial assessments. They are not valuations, forecasts or financial advice. Property-specific prices, approvals, legal status, tax treatment and risks must be independently verified.

## Build note

No new npm dependency was added. A local build could not be completed in the packaging environment because the npm registry was unavailable.
