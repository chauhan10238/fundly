export type InstitutionalInputs={technical?:number;macro?:number;sector?:number;etfStrength?:number;news?:number;marketRegime?:number;portfolioFit?:number;volatility?:number;dataQuality?:number}
export type InstitutionalScore={score:number;probability:number;confidence:number;reliability:number;outlook:"Bullish"|"Neutral"|"Bearish";components:Record<string,{score:number;weight:number;contribution:number}>;missing:string[]}
const WEIGHTS={technical:.20,macro:.15,sector:.15,etfStrength:.15,news:.10,marketRegime:.10,portfolioFit:.10,volatility:.05} as const
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)))
export function scoreInstitutional(i:InstitutionalInputs):InstitutionalScore{
 let total=0,used=0;const components:InstitutionalScore["components"]={};const missing:string[]=[]
 for(const [key,w] of Object.entries(WEIGHTS)){const raw=i[key as keyof InstitutionalInputs];if(typeof raw!=="number"||!Number.isFinite(raw)){missing.push(key);continue}const s=clamp(raw);total+=s*w;used+=w;components[key]={score:s,weight:w,contribution:+(s*w).toFixed(2)}}
 const score=used?clamp(total/used):50;const quality=clamp(i.dataQuality??used*100);const distance=Math.abs(score-52);const probability=clamp(50+distance*.72+(quality-50)*.12,50,88);const confidence=clamp(quality*.55+probability*.45-missing.length*2);const reliability=clamp(confidence*.65+quality*.35);const outlook=score>=63?"Bullish":score<=43?"Bearish":"Neutral"
 return {score,probability,confidence,reliability,outlook,components,missing}
}
