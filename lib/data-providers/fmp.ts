import { err, fetchJson, num } from "./http"
import type { ProviderResult, VerifiedQuote } from "./types"

const STABLE_BASE = "https://financialmodelingprep.com/stable"
const LEGACY_BASE = "https://financialmodelingprep.com/api/v3"

function key() {
  return process.env.FMP_API_KEY?.trim()
}

function quoteFromRow(row: any, symbol: string): VerifiedQuote | null {
  const price = num(row?.price)
  if (price === undefined || price <= 0) return null

  const previousClose =
    num(row?.previousClose) ??
    (num(row?.change) !== undefined ? price - Number(row.change) : undefined)

  return {
    symbol: String(row?.symbol ?? symbol).toUpperCase(),
    price,
    previousClose,
    change: num(row?.change),
    changePercent: num(row?.changesPercentage ?? row?.changePercentage),
    latestTradingDay:
      typeof row?.timestamp === "number"
        ? new Date(row.timestamp * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
  }
}

export async function getFmpQuote(
  symbolInput: string,
): Promise<ProviderResult<VerifiedQuote>> {
  const retrievedAt = new Date().toISOString()
  const apiKey = key()
  const symbol = symbolInput.trim().toUpperCase()

  if (!apiKey) {
    return {
      ok: false,
      provider: "Financial Modeling Prep",
      error: "FMP_API_KEY is not configured",
      retrievedAt,
    }
  }

  const urls = [
    `${STABLE_BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
    `${LEGACY_BASE}/quote/${encodeURIComponent(symbol)}?apikey=${encodeURIComponent(apiKey)}`,
  ]

  let lastError = "No quote returned"

  for (const sourceUrl of urls) {
    try {
      const payload = await fetchJson<any>(sourceUrl, {}, 10000)
      const row = Array.isArray(payload) ? payload[0] : payload
      const data = quoteFromRow(row, symbol)

      if (!data) {
        lastError = `No valid quote returned for ${symbol}`
        continue
      }

      return {
        ok: true,
        provider: "Financial Modeling Prep",
        retrievedAt,
        sourceUrl,
        data,
      }
    } catch (error) {
      lastError = err(error)
    }
  }

  return {
    ok: false,
    provider: "Financial Modeling Prep",
    error: lastError,
    retrievedAt,
  }
}
