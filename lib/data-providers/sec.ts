import { err, fetchJson } from "./http"
import type { ProviderResult, SecCompanyFacts, SecFiling, SecTickerRecord } from "./types"
const headers = () => ({ "User-Agent": process.env.SEC_USER_AGENT || "", Accept: "application/json", "Accept-Encoding": "gzip, deflate" })
const padCik = (value: string | number) => String(value).replace(/\D/g, "").padStart(10, "0")

export async function getSecTickerMap(): Promise<ProviderResult<Record<string, SecTickerRecord>>> {
  const retrievedAt = new Date().toISOString(), sourceUrl = "https://www.sec.gov/files/company_tickers.json"
  if (!process.env.SEC_USER_AGENT) return { ok: false, provider: "SEC EDGAR", error: "SEC_USER_AGENT is not configured", retrievedAt, sourceUrl }
  try {
    const payload = await fetchJson<Record<string, any>>(sourceUrl, { headers: headers(), next: { revalidate: 86400 } }, 10000)
    const data = Object.values(payload).reduce<Record<string, SecTickerRecord>>((acc, item: any) => { acc[item.ticker.toUpperCase()] = { cik: padCik(item.cik_str), ticker: item.ticker.toUpperCase(), title: item.title }; return acc }, {})
    return { ok: true, provider: "SEC EDGAR", retrievedAt, sourceUrl, data }
  } catch (error) { return { ok: false, provider: "SEC EDGAR", error: err(error), retrievedAt, sourceUrl } }
}

export async function resolveSecTicker(ticker: string): Promise<ProviderResult<SecTickerRecord>> {
  const map = await getSecTickerMap()
  if (!map.ok) return map
  const record = map.data[ticker.toUpperCase()]
  return record ? { ok: true, provider: "SEC EDGAR", retrievedAt: map.retrievedAt, sourceUrl: map.sourceUrl, data: record } : { ok: false, provider: "SEC EDGAR", retrievedAt: map.retrievedAt, sourceUrl: map.sourceUrl, error: `SEC CIK not found for ${ticker}` }
}

export async function getSecFilings(ticker: string, forms = ["10-K","10-Q","8-K"], limit = 12): Promise<ProviderResult<SecFiling[]>> {
  const resolved = await resolveSecTicker(ticker), retrievedAt = new Date().toISOString()
  if (!resolved.ok) return resolved
  const sourceUrl = `https://data.sec.gov/submissions/CIK${resolved.data.cik}.json`
  try {
    const payload = await fetchJson<any>(sourceUrl, { headers: headers(), next: { revalidate: 900 } }, 10000), recent = payload.filings?.recent, out: SecFiling[] = []
    for (let i=0; i<(recent?.accessionNumber?.length ?? 0) && out.length<limit; i++) {
      const form = recent.form[i]; if (!forms.includes(form)) continue
      const accessionNumber = recent.accessionNumber[i], primaryDocument = recent.primaryDocument[i], cik = String(Number(resolved.data.cik))
      out.push({ accessionNumber, filingDate: recent.filingDate[i], reportDate: recent.reportDate[i] || undefined, form, primaryDocument, description: recent.primaryDocDescription[i] || undefined, url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber.replace(/-/g,"")}/${primaryDocument}` })
    }
    return { ok: true, provider: "SEC EDGAR", retrievedAt, sourceUrl, data: out }
  } catch (error) { return { ok: false, provider: "SEC EDGAR", error: err(error), retrievedAt, sourceUrl } }
}

export async function getSecCompanyFacts(ticker: string): Promise<ProviderResult<SecCompanyFacts>> {
  const resolved = await resolveSecTicker(ticker), retrievedAt = new Date().toISOString()
  if (!resolved.ok) return resolved
  const sourceUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${resolved.data.cik}.json`
  try {
    const payload = await fetchJson<any>(sourceUrl, { headers: headers(), next: { revalidate: 21600 } }, 12000)
    return { ok: true, provider: "SEC EDGAR", retrievedAt, sourceUrl, data: { cik: padCik(payload.cik), entityName: payload.entityName, facts: payload.facts } }
  } catch (error) { return { ok: false, provider: "SEC EDGAR", error: err(error), retrievedAt, sourceUrl } }
}
