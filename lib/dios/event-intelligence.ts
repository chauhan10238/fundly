export type MarketEvent={id:string;date:string;title:string;category:"macro"|"earnings"|"central-bank"|"other";importance:"Low"|"Medium"|"High";tickers?:string[];source?:string}
export type EventRisk={today:MarketEvent[];next48Hours:MarketEvent[];thisWeek:MarketEvent[];risk:"Low"|"Medium"|"High";score:number;summary:string}
const day=(s:string)=>new Date(`${s}T12:00:00Z`).getTime()
export function assessEventRisk(events:MarketEvent[],now=new Date()):EventRisk{
 const start=new Date(now.toISOString().slice(0,10)+"T00:00:00Z").getTime(), d2=start+2*86400000,d7=start+7*86400000
 const sorted=[...events].sort((a,b)=>a.date.localeCompare(b.date)); const today=sorted.filter(e=>day(e.date)>=start&&day(e.date)<start+86400000); const next48Hours=sorted.filter(e=>day(e.date)>=start&&day(e.date)<d2); const thisWeek=sorted.filter(e=>day(e.date)>=start&&day(e.date)<d7)
 const points=next48Hours.reduce((s,e)=>s+(e.importance==="High"?30:e.importance==="Medium"?15:5),0); const score=Math.min(100,points); const risk=score>=60?"High":score>=25?"Medium":"Low"
 return {today,next48Hours,thisWeek,risk,score,summary:next48Hours.length?`${next48Hours.length} scheduled event(s) in the next 48 hours; event risk is ${risk.toLowerCase()}.`:"No supplied high-impact event is scheduled in the next 48 hours."}
}
