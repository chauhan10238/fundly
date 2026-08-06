import { getFmpApiKey, getFmpQuote } from "./fmp"
import { getAlphaVantageQuote } from "./alpha-vantage"
import { getWtiSpotPrice } from "./eia"
import { getFinnhubCompanyNews } from "./finnhub"
import { getFredSeries } from "./fred"
import { getSecTickerMap } from "./sec"
import type { ProviderHealth } from "./types"

export async function getProviderHealth(): Promise<ProviderHealth[]> {
  const checkedAt = new Date().toISOString()
  const cfg = { FRED: !!process.env.FRED_API_KEY, EIA: !!process.env.EIA_API_KEY, "Financial Modeling Prep": !!getFmpApiKey(), "Alpha Vantage": !!process.env.ALPHA_VANTAGE_API_KEY, Finnhub: !!process.env.FINNHUB_API_KEY, "SEC EDGAR": !!process.env.SEC_USER_AGENT } as const
  const results = await Promise.all([
    cfg.FRED ? getFredSeries("DGS10") : null,
    cfg.EIA ? getWtiSpotPrice() : null,
    cfg["Financial Modeling Prep"] ? getFmpQuote("AAPL") : null,
    cfg["Alpha Vantage"] ? getAlphaVantageQuote("IBM") : null,
    cfg.Finnhub ? getFinnhubCompanyNews("AAPL") : null,
    cfg["SEC EDGAR"] ? getSecTickerMap() : null,
  ])
  const names = ["FRED","EIA","Financial Modeling Prep","Alpha Vantage","Finnhub","SEC EDGAR"] as const
  return names.map((provider, i) => ({ provider, configured: cfg[provider], ok: !!results[i]?.ok, message: !cfg[provider] ? "Environment variable not configured" : results[i]?.ok ? "Connected" : results[i]?.error ?? "Connection failed", checkedAt }))
}
