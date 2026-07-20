import { NextRequest, NextResponse } from "next/server"
import { getInstrument } from "@/lib/dios/universe"
import {
  buildDynamicInstrument,
  fetchYahooNews,
  resolveLiveQuote,
  sourceFromQuote,
} from "@/lib/dios/server-market"
import type {
  ExternalAnalysisContext,
  LiveNewsItem,
  SourceCitation,
} from "@/lib/dios/types"
import {
  getCompanyIntelligence,
  normalizeCompanyIntelligence,
  quoteConfidence,
} from "@/lib/data-providers"

export const dynamic = "force-dynamic"

function normalize(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, "")
}

export async function GET(request: NextRequest) {
  const ticker = normalize(request.nextUrl.searchParams.get("ticker") ?? "")
  if (!ticker) {
    return NextResponse.json({ error: "Provide ticker." }, { status: 400 })
  }

  const [resolved, rawIntelligence, yahooNews] = await Promise.all([
    resolveLiveQuote(ticker, process.env.FMP_API_KEY),
    getCompanyIntelligence(ticker),
    fetchYahooNews(ticker),
  ])

  if (!resolved) {
    return NextResponse.json(
      {
        error: `No current market quote was returned for ${ticker}. Check the symbol and try again.`,
      },
      { status: 502 },
    )
  }

  const intelligence = normalizeCompanyIntelligence(rawIntelligence)

  const tracked = getInstrument(ticker)
  const instrument = tracked
    ? {
        ...tracked,
        name: resolved.name || tracked.name,
        currency: resolved.currency || tracked.currency,
        price: resolved.snapshot.price,
        prevClose: resolved.snapshot.previousClose,
      }
    : buildDynamicInstrument({
        symbol: ticker,
        name: resolved.name,
        type: resolved.type,
        currency: resolved.currency,
        price: resolved.snapshot.price,
        previousClose: resolved.snapshot.previousClose,
      })

  const retrieved = new Date().toISOString()
  const verification = quoteConfidence(
    resolved.snapshot.price,
    rawIntelligence.quoteChecks,
  )

  const providerNews: LiveNewsItem[] =
    rawIntelligence.news.map((item) => ({
      title: item.title,
      publishedAt: item.publishedAt,
      url: item.url,
      source: item.source,
      sentiment: item.sentiment,
      relevance: "company",
    }))

  const mergedNews = [...providerNews, ...yahooNews]
    .filter((item, index, items) =>
      items.findIndex(
        (candidate) =>
          candidate.url === item.url ||
          candidate.title.toLowerCase() === item.title.toLowerCase(),
      ) === index,
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 20)

  const sources: SourceCitation[] = [
    sourceFromQuote(resolved.snapshot.provider, ticker, retrieved),
  ]

  if (rawIntelligence.providers.alphaQuote.ok) {
    sources.push({
      id: `S${sources.length + 1}`,
      name: "Alpha Vantage quote verification",
      date:
        rawIntelligence.providers.alphaQuote.data.latestTradingDay ||
        retrieved.slice(0, 10),
      url: rawIntelligence.providers.alphaQuote.sourceUrl,
      retrieved,
    })
  }

  intelligence.filings.slice(0, 5).forEach((filing) => {
    sources.push({
      id: `S${sources.length + 1}`,
      name: `SEC EDGAR ${filing.form}`,
      date: filing.filingDate,
      url: filing.url,
      retrieved,
    })
  })

  mergedNews.slice(0, 8).forEach((item) => {
    sources.push({
      id: `S${sources.length + 1}`,
      name: `${item.source} — ${item.title}`,
      date: item.publishedAt.slice(0, 10),
      url: item.url,
      retrieved,
    })
  })

  const context: ExternalAnalysisContext = {
    refreshedAt: retrieved,
    news: mergedNews,
    earnings: intelligence.earnings.nextDate
      ? {
          date: intelligence.earnings.nextDate,
          epsEstimated: intelligence.earnings.epsEstimate,
          revenueEstimated: intelligence.earnings.revenueEstimate,
          isUpcoming: true,
        }
      : null,
    fundamentals: {
      companyName: intelligence.entityName || instrument.name,
      sector: instrument.sector,
      industry: instrument.industry,
      description: intelligence.summary.join(" "),
    },
    etfHoldings: [],
    sources,
    warnings: [
      ...rawIntelligence.warnings,
      ...verification.conflicts,
      ...(verification.verifiedBy.length
        ? [
            `Live quote verified by ${verification.verifiedBy.join(", ")}. Source confidence ${verification.confidence}%.`,
          ]
        : ["Live quote has not yet been independently verified."]),
    ],
    instrument,
  }

  return NextResponse.json(
    {
      snapshot: resolved.snapshot,
      context,
      intelligence,
      verification,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  )
}
