import type { ProviderNewsItem } from "./types"
import type { NewsIntelligence, NewsTheme } from "./normalized-types"

const THEMES: Array<{ theme: string; keywords: string[] }> = [
  { theme: "Artificial Intelligence", keywords: [" ai ", "artificial intelligence", "machine learning", "genai"] },
  { theme: "Earnings", keywords: ["earnings", "revenue", "profit", "margin", "guidance", "quarter"] },
  { theme: "Demand", keywords: ["demand", "sales", "orders", "shipments", "consumer"] },
  { theme: "Products", keywords: ["launch", "product", "iphone", "ipad", "mac", "services", "cloud", "chip"] },
  { theme: "Regulation", keywords: ["regulation", "antitrust", "lawsuit", "court", "probe", "investigation"] },
  { theme: "China", keywords: ["china", "chinese", "beijing"] },
  { theme: "Capital Returns", keywords: ["buyback", "dividend", "repurchase"] },
  { theme: "Management", keywords: ["ceo", "management", "executive", "leadership"] },
]

function text(item: ProviderNewsItem) {
  return ` ${item.title} ${item.summary ?? ""} `.toLowerCase()
}

function inferSentiment(item: ProviderNewsItem): ProviderNewsItem["sentiment"] {
  if (item.sentiment !== "neutral") return item.sentiment

  const value = text(item)
  const positive = [
    "beats", "beat estimates", "growth", "record", "upgrade", "surge",
    "strong demand", "raises guidance", "buyback", "profit rises",
  ]
  const negative = [
    "misses", "missed estimates", "downgrade", "falls", "decline", "probe",
    "lawsuit", "weak demand", "cuts guidance", "warning",
  ]

  const pos = positive.filter((term) => value.includes(term)).length
  const neg = negative.filter((term) => value.includes(term)).length

  return pos > neg ? "positive" : neg > pos ? "negative" : "neutral"
}

export function normalizeNews(items: ProviderNewsItem[]): NewsIntelligence {
  const enriched = items.map((item) => ({
    ...item,
    sentiment: inferSentiment(item),
  }))

  const positiveCount = enriched.filter((item) => item.sentiment === "positive").length
  const negativeCount = enriched.filter((item) => item.sentiment === "negative").length
  const neutralCount = enriched.length - positiveCount - negativeCount

  const weighted = enriched.length
    ? (positiveCount - negativeCount) / enriched.length
    : 0

  const sentimentScore = Math.round(Math.max(0, Math.min(100, 50 + weighted * 50)))
  const sentiment =
    sentimentScore >= 58 ? "positive" :
    sentimentScore <= 42 ? "negative" : "neutral"

  const themes: NewsTheme[] = THEMES.map(({ theme, keywords }) => {
    const matching = enriched.filter((item) =>
      keywords.some((keyword) => text(item).includes(keyword)),
    )

    const positive = matching.filter((item) => item.sentiment === "positive").length
    const negative = matching.filter((item) => item.sentiment === "negative").length

    return {
      theme,
      mentions: matching.length,
      sentiment: positive > negative ? "positive" : negative > positive ? "negative" : "neutral",
    } satisfies NewsTheme
  })
    .filter((theme) => theme.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 6)

  return {
    articleCount: enriched.length,
    positiveCount,
    neutralCount,
    negativeCount,
    sentiment,
    sentimentScore,
    confidence: Math.min(95, Math.round(35 + enriched.length * 4)),
    themes,
    keyHeadlines: enriched.slice(0, 8).map((item) => ({
      title: item.title,
      source: item.source,
      publishedAt: item.publishedAt,
      url: item.url,
      sentiment: item.sentiment,
    })),
  }
}
