import { err, fetchJson, num } from "./http"
import type { EnergyObservation, ProviderResult } from "./types"

export async function getEiaSeries(route: string, options: { label: string; dataField?: string; frequency?: string; facets?: Record<string, string[]>; length?: number }): Promise<ProviderResult<EnergyObservation>> {
  const retrievedAt = new Date().toISOString()
  const key = process.env.EIA_API_KEY
  if (!key) return { ok: false, provider: "EIA", error: "EIA_API_KEY is not configured", retrievedAt }
  const field = options.dataField ?? "value"
  const query = new URLSearchParams({ api_key: key, length: String(options.length ?? 5), "sort[0][column]": "period", "sort[0][direction]": "desc", "data[0]": field })
  if (options.frequency) query.set("frequency", options.frequency)
  Object.entries(options.facets ?? {}).forEach(([facet, values]) => values.forEach(value => query.append(`facets[${facet}][]`, value)))
  const sourceUrl = `https://api.eia.gov/v2/${route.replace(/^\/+|\/+$/g, "")}/data/?${query}`
  try {
    const payload = await fetchJson<{ response?: { data?: Array<Record<string, unknown>> }; error?: string }>(sourceUrl, {}, 10000)
    if (payload.error) throw new Error(payload.error)
    const row = payload.response?.data?.find(x => num(x[field]) !== undefined)
    if (!row) throw new Error(`No data returned for ${options.label}`)
    return { ok: true, provider: "EIA", retrievedAt, sourceUrl, data: { seriesId: String(row.series ?? route), label: options.label, period: String(row.period ?? ""), value: num(row[field])!, units: row["unit-name"] ? String(row["unit-name"]) : undefined } }
  } catch (error) { return { ok: false, provider: "EIA", error: err(error), retrievedAt, sourceUrl } }
}

export const getWtiSpotPrice = () => getEiaSeries("petroleum/pri/spt", { label: "WTI Spot Price", frequency: "daily", facets: { product: ["EPCWTI"] }, length: 10 })
export const getBrentSpotPrice = () => getEiaSeries("petroleum/pri/spt", { label: "Brent Spot Price", frequency: "daily", facets: { product: ["EPCBRENT"] }, length: 10 })
