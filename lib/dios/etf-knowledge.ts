export type EtfDriver = { ticker: string; weight: number; role: string }
export type EtfKnowledge = {
  ticker: string
  name: string
  category: string
  sector: string
  drivers: EtfDriver[]
  macroSensitivities: Array<"rates" | "usd" | "oil" | "growth" | "inflation" | "volatility">
  risk: "Low" | "Medium" | "High"
  rebalanceFrequency: "daily" | "monthly" | "quarterly" | "unknown"
}

const KB: Record<string, EtfKnowledge> = {
  SPY: { ticker:"SPY", name:"SPDR S&P 500 ETF Trust", category:"US large cap", sector:"Broad Market", risk:"Medium", rebalanceFrequency:"quarterly", macroSensitivities:["growth","rates","volatility"], drivers:[{ticker:"MSFT",weight:7.0,role:"mega-cap technology"},{ticker:"NVDA",weight:6.6,role:"AI and semiconductors"},{ticker:"AAPL",weight:6.2,role:"consumer technology"},{ticker:"AMZN",weight:3.8,role:"consumer and cloud"}] },
  QQQ: { ticker:"QQQ", name:"Invesco QQQ Trust", category:"US growth", sector:"Technology Growth", risk:"High", rebalanceFrequency:"quarterly", macroSensitivities:["rates","growth","volatility"], drivers:[{ticker:"NVDA",weight:9.0,role:"AI and semiconductors"},{ticker:"MSFT",weight:8.5,role:"cloud and software"},{ticker:"AAPL",weight:8.0,role:"consumer technology"},{ticker:"AMZN",weight:5.5,role:"commerce and cloud"}] },
  SMH: { ticker:"SMH", name:"VanEck Semiconductor ETF", category:"Semiconductors", sector:"Semiconductors", risk:"High", rebalanceFrequency:"quarterly", macroSensitivities:["rates","growth","usd","volatility"], drivers:[{ticker:"NVDA",weight:20.0,role:"AI accelerators"},{ticker:"TSM",weight:13.0,role:"foundry capacity"},{ticker:"AVGO",weight:8.0,role:"networking and custom silicon"},{ticker:"AMD",weight:5.0,role:"CPUs and AI accelerators"},{ticker:"ASML",weight:5.0,role:"lithography equipment"}] },
  VGT: { ticker:"VGT", name:"Vanguard Information Technology ETF", category:"Technology", sector:"Information Technology", risk:"High", rebalanceFrequency:"quarterly", macroSensitivities:["rates","growth","volatility"], drivers:[{ticker:"AAPL",weight:16.0,role:"hardware and services"},{ticker:"MSFT",weight:15.0,role:"software and cloud"},{ticker:"NVDA",weight:14.0,role:"AI compute"},{ticker:"AVGO",weight:4.0,role:"semiconductors"}] },
  XLE: { ticker:"XLE", name:"Energy Select Sector SPDR Fund", category:"Energy", sector:"Energy", risk:"High", rebalanceFrequency:"quarterly", macroSensitivities:["oil","usd","growth","inflation"], drivers:[{ticker:"XOM",weight:23.0,role:"integrated energy"},{ticker:"CVX",weight:17.0,role:"integrated energy"},{ticker:"COP",weight:8.0,role:"exploration and production"}] },
  VNQ: { ticker:"VNQ", name:"Vanguard Real Estate ETF", category:"Real estate", sector:"Real Estate", risk:"Medium", rebalanceFrequency:"quarterly", macroSensitivities:["rates","growth","inflation"], drivers:[{ticker:"PLD",weight:8.0,role:"industrial property"},{ticker:"AMT",weight:6.0,role:"communications infrastructure"},{ticker:"EQIX",weight:5.0,role:"data centres"}] },
  SCHD: { ticker:"SCHD", name:"Schwab US Dividend Equity ETF", category:"Dividend", sector:"Dividend Quality", risk:"Medium", rebalanceFrequency:"quarterly", macroSensitivities:["rates","growth","volatility"], drivers:[{ticker:"HD",weight:4.5,role:"consumer cyclical"},{ticker:"CSCO",weight:4.2,role:"technology income"},{ticker:"ABBV",weight:4.1,role:"healthcare income"}] },
  GLD: { ticker:"GLD", name:"SPDR Gold Shares", category:"Commodity", sector:"Gold", risk:"Medium", rebalanceFrequency:"unknown", macroSensitivities:["usd","rates","inflation","volatility"], drivers:[] },
  TLT: { ticker:"TLT", name:"iShares 20+ Year Treasury Bond ETF", category:"Fixed income", sector:"Long Duration Treasuries", risk:"High", rebalanceFrequency:"monthly", macroSensitivities:["rates","inflation","growth"], drivers:[] },
  IWM: { ticker:"IWM", name:"iShares Russell 2000 ETF", category:"US small cap", sector:"Small Caps", risk:"High", rebalanceFrequency:"quarterly", macroSensitivities:["rates","growth","volatility"], drivers:[] },
}

export function getEtfKnowledge(ticker: string): EtfKnowledge | null { return KB[ticker.toUpperCase()] ?? null }
export function listEtfKnowledge(): EtfKnowledge[] { return Object.values(KB) }
