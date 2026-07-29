import { NextResponse } from "next/server"
import { fetchMarketOverview, resolveLiveQuote } from "@/lib/dios/server-market"
import { buildMarketIntelligence } from "@/lib/dios/market-intelligence"
import { listEtfKnowledge } from "@/lib/dios/etf-knowledge"
import { buildSectorIntelligence } from "@/lib/dios/sector-intelligence"
export const dynamic="force-dynamic"
export async function GET(){const rows=await fetchMarketOverview(process.env.FMP_API_KEY);const market=buildMarketIntelligence(rows);const etfs=listEtfKnowledge().slice(0,8);const driverTickers=[...new Set(etfs.flatMap(e=>e.drivers.map(d=>d.ticker)))].slice(0,24);const settled=await Promise.allSettled(driverTickers.map(async ticker=>{const q=await resolveLiveQuote(ticker,process.env.FMP_API_KEY);return q?{ticker,changePercent:q.snapshot.changePercent,isLive:q.snapshot.isLive}:null}));const quotes=settled.flatMap(x=>x.status==="fulfilled"&&x.value?[x.value]:[]);const sectors=etfs.map(e=>buildSectorIntelligence(e.ticker,quotes)).filter(Boolean);return NextResponse.json({generatedAt:new Date().toISOString(),market,sectors,coverage:{marketInputs:rows.length,driverQuotes:quotes.length,etfs:etfs.length}},{headers:{"Cache-Control":"no-store, max-age=0"}})}
