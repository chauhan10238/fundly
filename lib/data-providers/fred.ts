import { err, fetchJson, num } from "./http"
import type { MacroObservation, ProviderResult } from "./types"

const SERIES: Record<string, { label: string; units?: string }> = {
  DGS10: { label: "US 10-Year Treasury Yield", units: "%" },
  DGS2: { label: "US 2-Year Treasury Yield", units: "%" },
  FEDFUNDS: { label: "Federal Funds Rate", units: "%" },
  CPIAUCSL: { label: "US CPI", units: "Index" },
  PCEPI: { label: "US PCE Price Index", units: "Index" },
  UNRATE: { label: "US Unemployment Rate", units: "%" },
  BAMLH0A0HYM2: { label: "US High-Yield Credit Spread", units: "%" },
}

export async function getFredSeries(seriesId: string): Promise<ProviderResult<MacroObservation>> {
  const retrievedAt = new Date().toISOString()
  const key = process.env.FRED_API_KEY
  if (!key) return { ok: false, provider: "FRED", error: "FRED_API_KEY is not configured", retrievedAt }
  const query = new URLSearchParams({ series_id: seriesId, api_key: key, file_type: "json", sort_order: "desc", limit: "10" })
  const sourceUrl = `https://api.stlouisfed.org/fred/series/observations?${query}`
  try {
    const payload = await fetchJson<{ observations?: Array<{ date: string; value: string }>; error_message?: string }>(sourceUrl)
    if (payload.error_message) throw new Error(payload.error_message)
    const rows = (payload.observations ?? []).map(x => ({ date: x.date, value: num(x.value) })).filter((x): x is { date: string; value: number } => x.value !== undefined)
    if (!rows.length) throw new Error(`No observations returned for ${seriesId}`)
    const meta = SERIES[seriesId] ?? { label: seriesId }
    return { ok: true, provider: "FRED", retrievedAt, sourceUrl, data: { seriesId, label: meta.label, date: rows[0].date, value: rows[0].value, previousValue: rows[1]?.value, change: rows[1] ? rows[0].value - rows[1].value : undefined, units: meta.units } }
  } catch (error) { return { ok: false, provider: "FRED", error: err(error), retrievedAt, sourceUrl } }
}

export const getFredMacroSnapshot = () => Promise.all(Object.keys(SERIES).map(getFredSeries))
