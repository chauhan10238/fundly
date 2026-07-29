import type { MarketOverviewItem } from "./server-market"

export type MarketRegime = "Risk-on" | "Balanced" | "Risk-off"
export type MarketIntelligence = {
  regime: MarketRegime
  score: number
  confidence: number
  volatility: "Low" | "Medium" | "High"
  breadthProxy: "Positive" | "Mixed" | "Negative"
  drivers: string[]
  risks: string[]
  inputs: Record<string, number | null>
}
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)))
const item=(rows:MarketOverviewItem[],s:string)=>rows.find(r=>r.symbol===s)
export function buildMarketIntelligence(rows: MarketOverviewItem[]): MarketIntelligence {
  const sp=item(rows,"^GSPC"), nas=item(rows,"^IXIC"), vix=item(rows,"^VIX"), aud=item(rows,"AUDUSD=X")
  const spMove=sp?.changePercent ?? 0, nasMove=nas?.changePercent ?? 0, vixLevel=vix?.price ?? 20, vixMove=vix?.changePercent ?? 0
  const momentum=(spMove*0.45+nasMove*0.55)
  const volatilityPenalty=Math.max(0,(vixLevel-18)*1.7)+Math.max(0,vixMove)*0.45
  const score=clamp(55+momentum*9-volatilityPenalty)
  const regime:MarketRegime=score>=62?"Risk-on":score<=43?"Risk-off":"Balanced"
  const volatility=vixLevel>=28?"High":vixLevel>=19?"Medium":"Low"
  const breadthProxy=spMove>0.25&&nasMove>0.25?"Positive":spMove<-.25&&nasMove<-.25?"Negative":"Mixed"
  const available=[sp,nas,vix,aud].filter(Boolean).length
  const confidence=clamp(45+available*11+(Math.abs(momentum)>.35?8:0))
  const drivers:string[]=[]; const risks:string[]=[]
  if(nasMove>.3) drivers.push(`Nasdaq leadership is positive (${nasMove.toFixed(2)}%).`)
  if(spMove>.3) drivers.push(`S&P 500 participation is positive (${spMove.toFixed(2)}%).`)
  if(vixLevel<18) drivers.push(`VIX at ${vixLevel.toFixed(1)} supports risk appetite.`)
  if(nasMove<-.3) risks.push(`Nasdaq weakness (${nasMove.toFixed(2)}%) is a growth risk.`)
  if(spMove<-.3) risks.push(`S&P 500 weakness (${spMove.toFixed(2)}%) reduces market support.`)
  if(vixLevel>=24) risks.push(`Elevated VIX (${vixLevel.toFixed(1)}) increases gap and reversal risk.`)
  if(!drivers.length) drivers.push("No single market driver has a decisive positive edge.")
  if(!risks.length) risks.push("No critical market-wide risk gate is triggered by the available inputs.")
  return {regime,score,confidence,volatility,breadthProxy,drivers,risks,inputs:{sp500:spMove,nasdaq:nasMove,vix:vixLevel,vixChange:vixMove,audusd:aud?.changePercent??null}}
}
