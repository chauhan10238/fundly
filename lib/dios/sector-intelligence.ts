import { getEtfKnowledge } from "./etf-knowledge"
export type DriverQuote={ticker:string;changePercent:number;isLive?:boolean}
export type SectorIntelligence={ticker:string;sector:string;score:number;outlook:"Bullish"|"Neutral"|"Bearish";confirmation:number;leaders:string[];laggards:string[];explanation:string}
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)))
export function buildSectorIntelligence(ticker:string,quotes:DriverQuote[]):SectorIntelligence|null{
 const kb=getEtfKnowledge(ticker); if(!kb) return null
 const by=new Map(quotes.map(q=>[q.ticker.toUpperCase(),q])); let weighted=0,covered=0; const leaders:string[]=[],laggards:string[]=[]
 for(const d of kb.drivers){const q=by.get(d.ticker);if(!q)continue;weighted+=q.changePercent*d.weight;covered+=d.weight;if(q.changePercent>.35)leaders.push(d.ticker);if(q.changePercent<-.35)laggards.push(d.ticker)}
 const avg=covered?weighted/covered:0; const score=clamp(52+avg*10); const outlook=score>=62?"Bullish":score<=43?"Bearish":"Neutral"; const confirmation=clamp(kb.drivers.length?covered/kb.drivers.reduce((s,d)=>s+d.weight,0)*100:50)
 return {ticker:kb.ticker,sector:kb.sector,score,outlook,confirmation,leaders,laggards,explanation:covered?`${covered.toFixed(1)}% of known driver weight was observed; weighted driver move ${avg.toFixed(2)}%.`:`No constituent quotes were available, so sector confirmation remains neutral.`}
}
