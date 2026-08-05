import crypto from "node:crypto"
import { google, gmail_v1 } from "googleapis"
import { createAuthenticatedOAuthClient } from "./oauth"

export type SchwabTradeStatus = "Ready" | "Needs Review"
export type ParsedSchwabTrade = {
  messageId: string; threadId: string | null; subject: string; emailDate: string
  ticker: string | null; side: "Buy" | "Sell" | null; quantity: number | null
  price: number | null; currency: string; brokerageFee: number; fxFee: number
  tradeDate: string; orderType: string | null; status: SchwabTradeStatus
  fingerprint: string; preview: string; issues: string[]
}

function decode(v?: string | null) { try { return v ? Buffer.from(v, "base64url").toString("utf8") : "" } catch { return "" } }
function htmlToText(v: string) { return v.replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>|<\/div>|<\/tr>|<\/li>|<\/h\d>/gi,"\n").replace(/<\/td>|<\/th>/gi," | ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#39;/gi,"'").replace(/&quot;/gi,'"') }
function collect(part?: gmail_v1.Schema$MessagePart): { plain:string[]; html:string[] } { const r={plain:[] as string[],html:[] as string[]}; if(!part)return r; const d=decode(part.body?.data); if(d){if(part.mimeType==="text/plain")r.plain.push(d); if(part.mimeType==="text/html")r.html.push(d)} for(const c of part.parts??[]){const n=collect(c);r.plain.push(...n.plain);r.html.push(...n.html)} return r }
function header(h: gmail_v1.Schema$MessagePartHeader[]|undefined,n:string){return h?.find(x=>x.name?.toLowerCase()===n.toLowerCase())?.value??""}
function clean(v:string){return v.replace(/\r/g,"\n").replace(/[ \t]+/g," ").replace(/\n{2,}/g,"\n").trim()}
function first(text:string, ps:RegExp[]){for(const p of ps){const m=text.match(p);if(m?.[1])return m[1].trim()}return null}
function num(v?:string|null){if(!v)return null;const n=Number(v.replace(/,/g,""));return Number.isFinite(n)&&n>=0?n:null}
function ticker(subject:string,text:string){const v=first(`${subject}\n${text}`,[/\b(?:Symbol|Ticker|Security symbol)\s*(?:[:|]|\n)\s*([A-Z][A-Z0-9.\-]{0,9})\b/i,/\b(?:BUY|BOUGHT|SELL|SOLD)\s+(?:TO\s+OPEN\s+|TO\s+CLOSE\s+)?(?:[\d,.]+\s+(?:SHARES?\s+OF\s+)?)?([A-Z][A-Z0-9.\-]{0,9})\b/i,/\b([A-Z][A-Z0-9.\-]{0,9})\s+(?:trade|order)\s+(?:confirmation|executed|filled)\b/i]);return v?.toUpperCase()??null}
function side(text:string):"Buy"|"Sell"|null{const v=first(text,[/\b(?:Action|Side|Transaction type)\s*(?:[:|]|\n)\s*(BUY|BOUGHT|SELL|SOLD)\b/i,/\b(BUY|BOUGHT|SELL|SOLD)\s+(?:TO\s+OPEN\s+|TO\s+CLOSE\s+)?(?:[\d,.]+\s+)?(?:SHARES?\s+OF\s+)?[A-Z][A-Z0-9.\-]{0,9}\b/i,/\b(BUY|SELL)\s+order\s+(?:executed|filled)\b/i]);if(!v)return null;return /BUY|BOUGHT/i.test(v)?"Buy":"Sell"}
function quantity(text:string){return num(first(text,[/\b(?:Quantity|Qty|Shares|Filled quantity|Execution quantity)\s*(?:[:|]|\n)\s*([\d,.]+)\b/i,/\b(?:BUY|BOUGHT|SELL|SOLD)\s+(?:TO\s+OPEN\s+|TO\s+CLOSE\s+)?([\d,.]+)\s+(?:SHARES?\s+OF\s+)?[A-Z]/i,/\b([\d,.]+)\s+shares?\s+(?:at|@|executed|filled)\b/i]))}
function price(text:string){return num(first(text,[/\b(?:Execution price|Executed price|Average price|Average execution price|Fill price|Price)\s*(?:[:|]|\n)\s*(?:USD|US\$|\$)?\s*([\d,.]+)\b/i,/\b(?:at|@)\s*(?:USD|US\$|\$)\s*([\d,.]+)\b/i]))}
function money(text:string,labels:string[]){const e=labels.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));return num(first(text,[new RegExp(`\\b(?:${e.join("|")})\\s*(?:[:|]|\\n)\\s*(?:USD|US\\$|\\$)?\\s*([\\d,.]+)`,`i`)]))??0}
function dateOf(h:string,i?:string|null){const n=i?Number(i):NaN;const d=Number.isFinite(n)?new Date(n):new Date(h);return Number.isNaN(d.getTime())?new Date().toISOString().slice(0,10):d.toISOString().slice(0,10)}
function fingerprint(x:{ticker:string|null;side:"Buy"|"Sell"|null;quantity:number|null;price:number|null;tradeDate:string}){return crypto.createHash("sha256").update([x.tradeDate,x.ticker??"?",x.side??"?",x.quantity??"?",x.price??"?"].join("|")).digest("hex").slice(0,20)}

function parseMessage(message:gmail_v1.Schema$Message):ParsedSchwabTrade{
  const hs=message.payload?.headers;const subject=header(hs,"Subject")||"(No subject)";const emailDate=header(hs,"Date");const b=collect(message.payload);const body=clean(b.plain.join("\n")||b.html.map(htmlToText).join("\n")||message.snippet||"")
  const t=ticker(subject,body),s=side(body),q=quantity(body),p=price(body),tradeDate=dateOf(emailDate,message.internalDate)
  const brokerageFee=money(body,["Commission","Brokerage","Transaction fee","Regulatory fee","SEC fee"])
  const issues:string[]=[];if(!t)issues.push("Ticker not identified");if(!s)issues.push("Buy/Sell side not identified");if(q===null||q<=0)issues.push("Quantity not identified");if(p===null||p<=0)issues.push("Execution price not identified")
  return {messageId:message.id??"",threadId:message.threadId??null,subject,emailDate,ticker:t,side:s,quantity:q,price:p,currency:"USD",brokerageFee,fxFee:0,tradeDate,orderType:first(body,[/\bOrder type\s*(?:[:|]|\n)\s*([A-Z ]+)\b/i]),status:issues.length?"Needs Review":"Ready",fingerprint:fingerprint({ticker:t,side:s,quantity:q,price:p,tradeDate}),preview:body.slice(0,900),issues}
}

export async function listParsedSchwabTrades(refreshToken:string,maxResults=100):Promise<ParsedSchwabTrade[]>{
  const auth=createAuthenticatedOAuthClient(refreshToken);const gmail=google.gmail({version:"v1",auth})
  const q='(from:(schwab.com) OR from:(notifications@schwab.com) OR from:(clientservice@schwab.com) OR "Charles Schwab") ("trade confirmation" OR "order executed" OR "order filled" OR "bought" OR "sold") newer_than:730d'
  const list=await gmail.users.messages.list({userId:"me",q,maxResults:Math.min(Math.max(maxResults,1),100)})
  const parsed=await Promise.all((list.data.messages??[]).map(async({id})=>{if(!id)return null;const r=await gmail.users.messages.get({userId:"me",id,format:"full"});return parseMessage(r.data)}))
  return parsed.filter((x):x is ParsedSchwabTrade=>x!==null).sort((a,b)=>b.tradeDate.localeCompare(a.tradeDate))
}
