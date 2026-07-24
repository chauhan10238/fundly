import { NextRequest, NextResponse } from "next/server"
import { enrichArticle } from "@/lib/news-intelligence"
import type { NewsArticle } from "@/lib/news-intelligence"

export const revalidate = 1800

const fallbackArticles: NewsArticle[] = [
  enrichArticle({
    title: "NRI property sale checklist: TDS, capital gains and repatriation planning",
    description: "The key documents and professional workstreams overseas owners should organise before accepting a buyer or settlement date.",
    url: "https://www.livemint.com/money/personal-finance",
    image: null,
    source: "Mint",
    publishedAt: "2026-07-01T00:00:00Z",
  }),
  enrichArticle({
    title: "How infrastructure and rental demand shape Indian property investment decisions",
    description: "A location should be assessed for employment, connectivity, tenant depth, maintenance burden and resale liquidity—not only launch pricing.",
    url: "https://economictimes.indiatimes.com/wealth/real-estate",
    image: null,
    source: "The Economic Times",
    publishedAt: "2026-07-01T00:00:00Z",
  }),
  enrichArticle({
    title: "FEMA and banking records NRIs should prepare before remitting property proceeds",
    description: "NRO banking, source-of-funds evidence and tax documentation are commonly reviewed before an overseas remittance is processed.",
    url: "https://www.business-standard.com/finance/personal-finance",
    image: null,
    source: "Business Standard",
    publishedAt: "2026-07-01T00:00:00Z",
  }),
  enrichArticle({
    title: "Remote landlords: what to include in an India property management scope",
    description: "Inspection evidence, tenant status, rent reporting, maintenance approvals and escalation arrangements help overseas owners retain control.",
    url: "https://housing.com/news/",
    image: null,
    source: "Housing.com News",
    publishedAt: "2026-07-01T00:00:00Z",
  }),
]

const query = [
  '"NRI property"',
  '"NRI real estate" India',
  '"NRI property tax"',
  '"NRI property TDS"',
  '"NRI capital gains" property',
  '"NRI property investment" India',
  'FEMA property NRI',
  'RBI NRI remittance property',
  'India real estate infrastructure Noida Gurugram Jaipur Lucknow',
].join(" OR ")

async function fetchGNews(apiKey: string, searchQuery: string): Promise<NewsArticle[]> {
  const endpoint = new URL("https://gnews.io/api/v4/search")
  endpoint.searchParams.set("q", searchQuery)
  endpoint.searchParams.set("lang", "en")
  endpoint.searchParams.set("country", "in")
  endpoint.searchParams.set("max", "10")
  endpoint.searchParams.set("sortby", "publishedAt")
  endpoint.searchParams.set("apikey", apiKey)

  const response = await fetch(endpoint, { next: { revalidate: 1800 } })
  if (!response.ok) throw new Error(`GNews failed: ${response.status}`)
  const data = await response.json()

  return (data.articles || []).map((article: any) =>
    enrichArticle({
      title: article.title,
      description: article.description || article.content || "Open the original publisher for details.",
      url: article.url,
      image: article.image || null,
      source: article.source?.name || "News source",
      publishedAt: article.publishedAt,
    }),
  )
}

async function fetchNewsApi(apiKey: string, searchQuery: string): Promise<NewsArticle[]> {
  const endpoint = new URL("https://newsapi.org/v2/everything")
  endpoint.searchParams.set("q", searchQuery)
  endpoint.searchParams.set("language", "en")
  endpoint.searchParams.set("sortBy", "publishedAt")
  endpoint.searchParams.set("pageSize", "20")
  endpoint.searchParams.set(
    "domains",
    [
      "livemint.com",
      "economictimes.indiatimes.com",
      "business-standard.com",
      "moneycontrol.com",
      "financialexpress.com",
      "housing.com",
      "magicbricks.com",
      "99acres.com",
      "anarock.com",
      "knightfrank.co.in",
      "jll.co.in",
      "cbre.co.in",
      "colliers.com",
    ].join(","),
  )

  const response = await fetch(endpoint, {
    headers: { "X-Api-Key": apiKey },
    next: { revalidate: 1800 },
  })
  if (!response.ok) throw new Error(`NewsAPI failed: ${response.status}`)
  const data = await response.json()

  return (data.articles || [])
    .filter((article: any) => article.title && article.url && article.publishedAt)
    .map((article: any) =>
      enrichArticle({
        title: article.title,
        description: article.description || "Open the original publisher for details.",
        url: article.url,
        image: article.urlToImage || null,
        source: article.source?.name || "News source",
        publishedAt: article.publishedAt,
      }),
    )
}

function dedupe(articles: NewsArticle[]) {
  const seen = new Set<string>()
  return articles.filter((article) => {
    const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 90)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function GET(request: NextRequest) {
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 12), 30)
  const customQuery = request.nextUrl.searchParams.get("q")?.trim()
  const searchQuery = customQuery || query
  const gnewsKey = process.env.GNEWS_API_KEY
  const newsApiKey = process.env.NEWS_API_KEY

  try {
    const providerArticles = gnewsKey
      ? await fetchGNews(gnewsKey, searchQuery)
      : newsApiKey
        ? await fetchNewsApi(newsApiKey, searchQuery)
        : []

    const articles = dedupe(providerArticles).slice(0, limit)
    if (articles.length) {
      return NextResponse.json({
        live: true,
        provider: gnewsKey ? "GNews" : "NewsAPI",
        updatedAt: new Date().toISOString(),
        articles,
      })
    }
  } catch (error) {
    console.error("Property news provider error", error)
  }

  return NextResponse.json({
    live: false,
    provider: "Curated fallback",
    updatedAt: new Date().toISOString(),
    articles: fallbackArticles.slice(0, limit),
  })
}
