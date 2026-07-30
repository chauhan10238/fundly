import { err, fetchJson, num } from "./http"
import type { EarningsEvent, FmpFundamentals, ProviderResult, VerifiedQuote } from "./types"
const BASE = "https://financialmodelingprep.com/stable"
function key() { return process.env.FMP_API_KEY?.trim() }
function url(endpoint: string, symbol: string) { return `${BASE}/${endpoint}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key() ?? "")}` }
function first(payload: any) { return Array.isArray(payload) ? payload[0] : payload }
function value(...items: any[]) { for (const item of items) { const n=num(item); if (n !== undefined) return n } return undefined }
export async function getFmpQuote(symbolInput: string): Promise<ProviderResult<VerifiedQuote>> {
  const retrievedAt=new Date().toISOString(), symbol=symbolInput.trim().toUpperCase(), sourceUrl=url("quote",symbol)
  if (!key()) return {ok:false,provider:"Financial Modeling Prep",error:"FMP_API_KEY is not configured",retrievedAt,sourceUrl}
  try { const row=first(await fetchJson<any>(sourceUrl,{},10000)); const price=num(row?.price); if (!price || price<=0) throw new Error(`No valid quote for ${symbol}`); return {ok:true,provider:"Financial Modeling Prep",retrievedAt,sourceUrl,data:{symbol:String(row?.symbol??symbol).toUpperCase(),price,previousClose:value(row?.previousClose,price-num(row?.change)),change:num(row?.change),changePercent:value(row?.changesPercentage,row?.changePercentage),latestTradingDay:typeof row?.timestamp==="number"?new Date(row.timestamp*1000).toISOString().slice(0,10):retrievedAt.slice(0,10)}} } catch(error){return {ok:false,provider:"Financial Modeling Prep",error:err(error),retrievedAt,sourceUrl}}
}
export async function getFmpFundamentals(symbolInput: string): Promise<ProviderResult<FmpFundamentals>> {
  const retrievedAt=new Date().toISOString(), symbol=symbolInput.trim().toUpperCase(), sourceUrl=url("income-statement-ttm",symbol)
  if (!key()) return {ok:false,provider:"Financial Modeling Prep",error:"FMP_API_KEY is not configured",retrievedAt,sourceUrl}
  try {
    const [incomePayload,balancePayload,cashPayload,ratiosPayload,metricsPayload,profilePayload] = await Promise.all([
      fetchJson<any>(url("income-statement-ttm",symbol),{},12000), fetchJson<any>(url("balance-sheet-statement-ttm",symbol),{},12000), fetchJson<any>(url("cash-flow-statement-ttm",symbol),{},12000), fetchJson<any>(url("ratios-ttm",symbol),{},12000), fetchJson<any>(url("key-metrics-ttm",symbol),{},12000), fetchJson<any>(url("profile",symbol),{},12000),
    ])
    const i=first(incomePayload)??{}, b=first(balancePayload)??{}, c=first(cashPayload)??{}, r=first(ratiosPayload)??{}, m=first(metricsPayload)??{}, profile=first(profilePayload)??{}
    const revenue=value(i.revenue,i.revenueTTM), netIncome=value(i.netIncome,i.netIncomeTTM), operatingCashFlow=value(c.operatingCashFlow,c.netCashProvidedByOperatingActivities), capex=value(c.capitalExpenditure,c.capitalExpenditureTTM), fcf=value(c.freeCashFlow, operatingCashFlow !== undefined && capex !== undefined ? operatingCashFlow-Math.abs(capex):undefined)
    const data:FmpFundamentals={entityName:String(profile.companyName??profile.name??symbol),currency:String(profile.currency??i.reportedCurrency??"USD"),revenueTTM:revenue,grossProfitTTM:value(i.grossProfit,i.grossProfitTTM),operatingIncomeTTM:value(i.operatingIncome,i.operatingIncomeTTM),netIncomeTTM:netIncome,operatingCashFlowTTM:operatingCashFlow,capitalExpenditureTTM:capex,freeCashFlowTTM:fcf,cash:value(b.cashAndCashEquivalents,b.cashAndShortTermInvestments),totalDebt:value(b.totalDebt,m.netDebt),assets:value(b.totalAssets),liabilities:value(b.totalLiabilities),equity:value(b.totalStockholdersEquity,b.totalEquity),sharesOutstanding:value(i.weightedAverageShsOutDil,profile.volAvg),epsDilutedTTM:value(i.epsDiluted,i.epsdiluted),bookValuePerShare:value(m.bookValuePerShareTTM,m.bookValuePerShare),grossMargin:value(r.grossProfitMarginTTM,r.grossProfitMargin),operatingMargin:value(r.operatingProfitMarginTTM,r.operatingProfitMargin),profitMargin:value(r.netProfitMarginTTM,r.netProfitMargin),freeCashFlowMargin:revenue&&fcf!==undefined?(fcf/revenue)*100:undefined,returnOnEquity:value(r.returnOnEquityTTM,r.returnOnEquity,m.roeTTM),debtToEquity:value(r.debtEquityRatioTTM,r.debtEquityRatio),currentRatio:value(r.currentRatioTTM,r.currentRatio),sourcePeriod:String(i.date??"TTM"),latestFiled:String(i.fillingDate??i.filingDate??i.date??retrievedAt.slice(0,10))}
    if (!data.revenueTTM && !data.netIncomeTTM && !data.freeCashFlowTTM) throw new Error(`No FMP Starter fundamentals returned for ${symbol}`)
    return {ok:true,provider:"Financial Modeling Prep",retrievedAt,sourceUrl,data}
  } catch(error){return {ok:false,provider:"Financial Modeling Prep",error:err(error),retrievedAt,sourceUrl}}
}
export async function getFmpEarnings(symbolInput:string):Promise<ProviderResult<EarningsEvent[]>>{
  const retrievedAt=new Date().toISOString(),symbol=symbolInput.trim().toUpperCase(),sourceUrl=url("earnings",symbol)
  if(!key()) return {ok:false,provider:"Financial Modeling Prep",error:"FMP_API_KEY is not configured",retrievedAt,sourceUrl}
  try{const payload=await fetchJson<any>(sourceUrl,{},12000);const rows=Array.isArray(payload)?payload:[];const data=rows.map((row:any)=>({symbol,date:String(row.date??""),hour:row.time??row.hour,epsEstimate:num(row.epsEstimated??row.epsEstimate),epsActual:num(row.epsActual),revenueEstimate:num(row.revenueEstimated??row.revenueEstimate),revenueActual:num(row.revenueActual),quarter:num(row.quarter),year:num(row.year)})).filter((x:EarningsEvent)=>Boolean(x.date));return {ok:true,provider:"Financial Modeling Prep",retrievedAt,sourceUrl,data}}catch(error){return {ok:false,provider:"Financial Modeling Prep",error:err(error),retrievedAt,sourceUrl}}
}
