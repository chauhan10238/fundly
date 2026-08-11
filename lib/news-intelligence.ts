export type NewsCategory =
  | "Tax & TDS"
  | "FEMA & RBI"
  | "Property Sale"
  | "Buying & Investment"
  | "Rental & Management"
  | "Legal & Documentation"
  | "Market & Infrastructure"
  | "Home Loans"

export type NewsArticle = {
  title: string
  description: string
  url: string
  image?: string | null
  source: string
  publishedAt: string
  category: NewsCategory
  nriImpact: string
  regions: string[]
  urgency: "time-sensitive" | "important" | "general"
}

const categoryRules: Array<[RegExp, NewsCategory]> = [
  [/\b(tds|capital gains|income tax|taxation|tax return|itr|dt?a?a|withholding)\b/i, "Tax & TDS"],
  [/\b(fema|rbi|foreign exchange|repatriat|nro|nre|remittance)\b/i, "FEMA & RBI"],
  [/\b(sell|sale deed|property sale|seller|resale|liquidit)\b/i, "Property Sale"],
  [/\b(home loan|mortgage|interest rate|housing finance|emi)\b/i, "Home Loans"],
  [/\b(rent|rental|tenant|lease|vacancy|property management)\b/i, "Rental & Management"],
  [/\b(power of attorney|poa|title|registry|registration|inherit|succession|mutation|legal heir|rera)\b/i, "Legal & Documentation"],
  [/\b(infrastructure|metro|airport|expressway|corridor|circle rate|stamp duty|price index|housing market)\b/i, "Market & Infrastructure"],
]

const regionRules: Array<[RegExp, string]> = [
  [/\b(noida|greater noida|yamuna expressway|jewar)\b/i, "Noida"],
  [/\b(gurugram|gurgaon)\b/i, "Gurugram"],
  [/\b(delhi|ncr)\b/i, "Delhi NCR"],
  [/\b(jaipur|rajasthan)\b/i, "Rajasthan"],
  [/\b(lucknow|uttar pradesh|up)\b/i, "Uttar Pradesh"],
  [/\b(chandigarh|punjab|mohali|panchkula)\b/i, "Punjab & Tricity"],
  [/\b(dehradun|uttarakhand|haridwar|nainital|mukteshwar)\b/i, "Uttarakhand"],
  [/\b(shimla|himachal)\b/i, "Himachal Pradesh"],
]

export function enrichArticle(input: Omit<NewsArticle, "category" | "nriImpact" | "regions" | "urgency">): NewsArticle {
  const haystack = `${input.title} ${input.description}`
  const category = categoryRules.find(([rule]) => rule.test(haystack))?.[1] || "Buying & Investment"
  const regions = regionRules.filter(([rule]) => rule.test(haystack)).map(([, region]) => region)
  const urgency = /\b(deadline|last date|effective from|withholding|tds|tax notice|penalty|compliance|rbi circular|fema)\b/i.test(haystack)
    ? "time-sensitive"
    : /\b(rate cut|rule change|new regulation|stamp duty|circle rate|rera|infrastructure)\b/i.test(haystack)
      ? "important"
      : "general"

  const impactByCategory: Record<NewsCategory, string> = {
    "Tax & TDS": "May change the tax withheld, documentation required or cash available at settlement for an overseas seller.",
    "FEMA & RBI": "May affect how an NRI or OCI receives, holds or transfers property-related money across borders.",
    "Property Sale": "Relevant to sale readiness, buyer negotiations, settlement timing and the eventual transfer of proceeds overseas.",
    "Buying & Investment": "Useful when comparing locations, pricing, rental demand, developer risk and future exit options.",
    "Rental & Management": "Relevant to rent, tenant management, vacancy, maintenance obligations and remote owner reporting.",
    "Legal & Documentation": "May affect ownership verification, Power of Attorney, registration, inheritance or mutation requirements.",
    "Market & Infrastructure": "May influence demand, property values, rental activity and resale liquidity in the affected market.",
    "Home Loans": "May affect eligibility, EMI, interest cost, documentation and affordability for overseas buyers.",
  }

  return {
    ...input,
    category,
    nriImpact: impactByCategory[category],
    regions: regions.length ? regions : ["India"],
    urgency,
  }
}

export const trustedSources = [
  { name: "Mint", focus: "NRI tax, personal finance and investment", url: "https://www.livemint.com/money/personal-finance" },
  { name: "The Economic Times", focus: "Property markets, wealth and taxation", url: "https://economictimes.indiatimes.com/wealth/real-estate" },
  { name: "Business Standard", focus: "Policy, finance and personal taxation", url: "https://www.business-standard.com/finance/personal-finance" },
  { name: "Moneycontrol", focus: "Markets, housing, REITs and personal finance", url: "https://www.moneycontrol.com/news/business/real-estate/" },
  { name: "Financial Express", focus: "Tax, banking and real-estate updates", url: "https://www.financialexpress.com/money/" },
  { name: "Housing.com News", focus: "Property law, taxation and city guides", url: "https://housing.com/news/" },
  { name: "Magicbricks News", focus: "Residential markets and infrastructure", url: "https://www.magicbricks.com/blog/" },
  { name: "ANAROCK Research", focus: "Institutional real-estate research", url: "https://www.anarock.com/insights" },
  { name: "Knight Frank India", focus: "Market reports and price trends", url: "https://www.knightfrank.co.in/research" },
  { name: "RBI", focus: "FEMA, banking and remittance rules", url: "https://www.rbi.org.in/" },
]
