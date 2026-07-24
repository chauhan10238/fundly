import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 300

type RequestBody = {
  purpose: "rent" | "sell"
  address: string
  placeId?: string
  propertyType: string
  bedrooms: string
  bathrooms: string
  areaSqft: string
  furnishing?: string
  condition?: string
  propertyAge?: string
  rentalStatus?: string
  currentRent?: string
  outstandingLoan?: string
  ownership?: string
}

type Listing = {
  id: string
  title: string
  url?: string
  price: number
  areaSqft: number
  priceSqft: number
  bedrooms: number
  bathrooms: number
  furnishing: string
  propertyType: string
  locality: string
  society: string
  verified: boolean
  updatedAt?: string
  source: string
}

type Location = {
  formattedAddress: string
  latitude: number
  longitude: number
  city?: string
  state?: string
  postalCode?: string
  locality?: string
}

function numeric(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function median(values: number[]) {
  return percentile([...values].sort((a, b) => a - b), 0.5)
}

function normaliseFurnishing(value: unknown) {
  const text = String(value ?? "").toLowerCase().replace(/[\s_-]/g, "")
  if (text.includes("semi")) return "semi-furnished"
  if (text.includes("unfurnished")) return "unfurnished"
  if (text.includes("furnished")) return "furnished"
  return "unknown"
}

function normalisePropertyType(value: unknown) {
  const text = String(value ?? "").toLowerCase()
  if (text.includes("apartment") || text.includes("flat")) return "apartment"
  if (text.includes("builder") || text.includes("floor")) return "builder-floor"
  if (text.includes("villa")) return "villa"
  if (text.includes("house") || text.includes("independent")) return "independent-house"
  return text || "unknown"
}

function extractArea(record: any) {
  const area = record?.property?.area ?? {}
  return numeric(
    area.super_builtup_sqft ??
      area.builtup_sqft ??
      area.carpet_sqft ??
      area.super_builtup_area ??
      area.builtup_area ??
      area.carpet_area ??
      record?.areaSqft,
  )
}

function normaliseListing(record: any): Listing | null {
  const price = numeric(
    record?.pricing?.average_price ??
      record?.pricing?.min_price ??
      record?.pricing?.max_price ??
      record?.priceInr ??
      record?.price,
  )
  const areaSqft = extractArea(record)
  const bedrooms = numeric(record?.property?.bedrooms ?? record?.bedrooms)
  if (!price || !areaSqft || !bedrooms) return null

  return {
    id: String(record?.record_id ?? record?.listing?.property_id ?? record?.listing?.spid ?? record?.id ?? ""),
    title: String(record?.entity?.title ?? record?.listing?.title ?? record?.title ?? "Comparable property"),
    url: record?.source_context?.canonical_url ?? record?.listing?.details_url ?? record?.entity?.url ?? record?.url,
    price,
    areaSqft,
    priceSqft: numeric(record?.pricing?.price_sqft) || price / areaSqft,
    bedrooms,
    bathrooms: numeric(record?.property?.bathrooms ?? record?.bathrooms),
    furnishing: normaliseFurnishing(record?.property?.furnishing ?? record?.furnishing),
    propertyType: normalisePropertyType(record?.listing?.property_type ?? record?.propertyType),
    locality: String(record?.location?.locality ?? record?.location?.locality_name ?? ""),
    society: String(
      record?.location?.society_name ??
        record?.location?.building_name ??
        record?.relationships?.project?.project_name ??
        "",
    ),
    verified: Boolean(record?.attributes?.compliance?.verified || record?.attributes?.compliance?.self_verified),
    updatedAt: record?.listing?.updated_at ?? record?.listing?.posted_at,
    source: String(record?.source_context?.source_name ?? "99acres"),
  }
}

async function getLocation(body: RequestBody): Promise<Location> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY
  if (!key) throw new Error("Google Maps server key is not configured.")

  const params = new URLSearchParams({ key, region: "in" })
  if (body.placeId) params.set("place_id", body.placeId)
  else params.set("address", body.address)

  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, { cache: "no-store" })
  if (!response.ok) throw new Error("Google geocoding request failed.")

  const data = await response.json()
  const result = data.results?.[0]
  if (!result) throw new Error("We could not verify this Indian property location.")

  const component = (type: string) =>
    result.address_components?.find((item: any) => item.types?.includes(type))?.long_name

  return {
    formattedAddress: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    city: component("locality") || component("administrative_area_level_2"),
    state: component("administrative_area_level_1"),
    postalCode: component("postal_code"),
    locality:
      component("sublocality_level_1") ||
      component("sublocality") ||
      component("neighborhood") ||
      component("locality"),
  }
}

async function getAudPerInr() {
  const key = process.env.EXCHANGE_RATE_API_KEY
  if (!key) return 0

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${key}/pair/INR/AUD`, {
      next: { revalidate: 3600 },
    })
    if (!response.ok) return 0
    const data = await response.json()
    return data.result === "success" ? numeric(data.conversion_rate) : 0
  } catch {
    return 0
  }
}

async function runApify(body: RequestBody, location: Location) {
  const token = process.env.APIFY_API_TOKEN
  const actorId = process.env.APIFY_99ACRES_ACTOR_ID || "fatihtahta/99acres-scraper-ppe"
  const limit = Math.min(Math.max(numeric(process.env.APIFY_MAX_RESULTS) || 50, 10), 100)

  if (!token) throw new Error("APIFY_API_TOKEN is not configured in Vercel.")

  const searchLocation = [location.locality, location.city].filter(Boolean).join(", ") || body.address
  const encodedActor = actorId.replace("/", "~")
  const endpoint =
    `https://api.apify.com/v2/acts/${encodedActor}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(token)}&format=json&clean=true&timeout=240`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: [searchLocation],
      deal_type: body.purpose === "rent" ? "residential_rent" : "residential_sale",
      limit,
      verified_property: false,
      with_photo: false,
      with_video: false,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error("Apify actor failed:", response.status, detail)
    if (response.status === 401 || response.status === 403) {
      throw new Error("Apify authentication failed. Check APIFY_API_TOKEN and the Actor ID.")
    }
    throw new Error("The live 99acres market search did not complete. Please try again.")
  }

  const records = await response.json()
  if (!Array.isArray(records)) throw new Error("Apify returned an unexpected response.")
  return records.map(normaliseListing).filter(Boolean) as Listing[]
}

function removeOutliers(listings: Listing[]) {
  if (listings.length < 5) return listings
  const rates = listings.map((item) => item.priceSqft).sort((a, b) => a - b)
  const q1 = percentile(rates, 0.25)
  const q3 = percentile(rates, 0.75)
  const iqr = q3 - q1
  const low = Math.max(0, q1 - 1.5 * iqr)
  const high = q3 + 1.5 * iqr
  return listings.filter((item) => item.priceSqft >= low && item.priceSqft <= high)
}

function selectComparables(listings: Listing[], body: RequestBody) {
  const bedrooms = numeric(body.bedrooms)
  const area = numeric(body.areaSqft)
  const propertyType = normalisePropertyType(body.propertyType)
  const furnishing = normaliseFurnishing(body.furnishing)

  const base = listings.filter(
    (item) =>
      item.bedrooms === bedrooms &&
      (item.propertyType === propertyType || item.propertyType === "unknown"),
  )

  const stages = [
    base.filter(
      (item) =>
        item.areaSqft >= area * 0.8 &&
        item.areaSqft <= area * 1.2 &&
        (furnishing === "unknown" || item.furnishing === furnishing),
    ),
    base.filter((item) => item.areaSqft >= area * 0.7 && item.areaSqft <= area * 1.3),
    base.filter((item) => item.areaSqft >= area * 0.55 && item.areaSqft <= area * 1.45),
    base,
  ]

  const selected = stages.find((items) => items.length >= 5) || stages.find((items) => items.length > 0) || []
  return removeOutliers(selected)
}

function conditionFactor(condition?: string) {
  return { excellent: 1.04, good: 1, "minor-work": 0.96, renovation: 0.9 }[condition || "good"] ?? 1
}

function ageFactor(age?: string) {
  return { "0-5": 1.03, "5-10": 1, "10-20": 0.96, "20-plus": 0.9 }[age || "5-10"] ?? 1
}

function furnishingAdjustment(target: string, market: string) {
  const scores: Record<string, number> = { unfurnished: 0, "semi-furnished": 1, furnished: 2, unknown: 1 }
  return 1 + ((scores[target] ?? 1) - (scores[market] ?? 1)) * 0.08
}

function calculateEstimate(listings: Listing[], body: RequestBody) {
  const comparables = selectComparables(listings, body)
  if (comparables.length < 3) {
    throw new Error(
      `Only ${comparables.length} close comparable${comparables.length === 1 ? "" : "s"} were found. Please use a broader locality or request a verified assessment.`,
    )
  }

  const area = numeric(body.areaSqft)
  const targetFurnishing = normaliseFurnishing(body.furnishing)
  const adjustedValues = comparables.map((item) => {
    const areaAdjustment = Math.pow(area / item.areaSqft, 0.72)
    return (
      item.price *
      areaAdjustment *
      furnishingAdjustment(targetFurnishing, item.furnishing) *
      conditionFactor(body.condition) *
      ageFactor(body.propertyAge)
    )
  })

  const sorted = adjustedValues.sort((a, b) => a - b)
  const step = body.purpose === "rent" ? 500 : 50000
  const lowInr = Math.max(step, roundTo(percentile(sorted, 0.25), step))
  const midInr = Math.max(lowInr, roundTo(percentile(sorted, 0.5), step))
  const highInr = Math.max(midInr, roundTo(percentile(sorted, 0.75), step))
  const medianRate = median(comparables.map((item) => item.priceSqft))
  const verifiedShare = comparables.filter((item) => item.verified).length / comparables.length
  const exactFurnishingShare =
    comparables.filter((item) => item.furnishing === targetFurnishing).length / comparables.length
  const areaFitShare =
    comparables.filter((item) => item.areaSqft >= area * 0.8 && item.areaSqft <= area * 1.2).length /
    comparables.length

  const confidenceScore = Math.round(
    Math.max(
      55,
      Math.min(
        82,
        37 +
          Math.min(comparables.length / 20, 1) * 30 +
          exactFurnishingShare * 15 +
          areaFitShare * 20 +
          verifiedShare * 10 -
          8,
      ),
    ),
  )

  const societyCounts = comparables.reduce<Record<string, number>>((acc, item) => {
    if (item.society) acc[item.society] = (acc[item.society] || 0) + 1
    return acc
  }, {})

  return {
    lowInr,
    midInr,
    highInr,
    confidenceScore,
    confidenceLabel: confidenceScore >= 75 ? "Good" : confidenceScore >= 65 ? "Moderate" : "Indicative",
    comparableCount: comparables.length,
    sourceLabel: "Live 99acres listings via Apify",
    medianPriceSqft: Math.round(medianRate),
    recommendedListing:
      body.purpose === "rent" ? roundTo(highInr * 1.02, 500) : roundTo(highInr * 1.015, 50000),
    negotiatedLow:
      body.purpose === "rent" ? roundTo(lowInr * 0.95, 500) : roundTo(lowInr * 0.96, 50000),
    negotiatedHigh:
      body.purpose === "rent" ? roundTo(midInr * 0.98, 500) : roundTo(midInr * 0.99, 50000),
    societies: Object.entries(societyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name),
    sampleComparables: [...comparables]
      .sort((a, b) => Math.abs(a.areaSqft - area) - Math.abs(b.areaSqft - area))
      .slice(0, 5)
      .map((item) => ({
        title: item.title,
        society: item.society,
        price: item.price,
        areaSqft: item.areaSqft,
        bedrooms: item.bedrooms,
        furnishing: item.furnishing,
        verified: item.verified,
        url: item.url,
      })),
  }
}

function saleCosts(midInr: number) {
  return [
    { label: "Brokerage", lowInr: midInr * 0.01, highInr: midInr * 0.02 },
    { label: "Legal and documentation", lowInr: 25000, highInr: 75000 },
    { label: "Repairs and presentation", lowInr: midInr * 0.0025, highInr: midInr * 0.01 },
    { label: "Society / transfer and administration", lowInr: 10000, highInr: 50000 },
  ].map((item) => ({ ...item, lowInr: Math.round(item.lowInr), highInr: Math.round(item.highInr) }))
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    if (!body.address || !body.propertyType || numeric(body.areaSqft) < 200) {
      return NextResponse.json(
        { message: "Please enter a valid location, property type and built-up area." },
        { status: 400 },
      )
    }

    const [location, currencyRate] = await Promise.all([getLocation(body), getAudPerInr()])
    const listings = await runApify(body, location)
    const market = calculateEstimate(listings, body)
    const annualIncome = body.purpose === "rent" ? market.midInr * 12 : undefined
    const currentRent = numeric(body.currentRent)

    const inrGrowth = numeric(process.env.PROPERTY_GROWTH_SCENARIO) || 0.06
    const inrDepreciation = numeric(process.env.INR_AUD_DEPRECIATION_SCENARIO) || 0.025
    const audGrowth = (1 + inrGrowth) / (1 + inrDepreciation) - 1

    return NextResponse.json({
      currencyRate,
      location,
      estimate: {
        ...market,
        lowAud: currencyRate ? Math.round(market.lowInr * currencyRate) : undefined,
        midAud: currencyRate ? Math.round(market.midInr * currencyRate) : undefined,
        highAud: currencyRate ? Math.round(market.highInr * currencyRate) : undefined,
        annualIncome,
        annualIncomeAud: currencyRate && annualIncome ? Math.round(annualIncome * currencyRate) : undefined,
        potentialIncrease:
          body.purpose === "rent" && currentRent > 0 ? Math.max(0, market.midInr - currentRent) : undefined,
        unit: body.purpose === "rent" ? "monthly" : "total",
      },
      growthScenario: {
        inrAnnualPercent: Math.round(inrGrowth * 1000) / 10,
        audAnnualPercent: Math.round(audGrowth * 1000) / 10,
        fiveYearInr: Math.round(market.midInr * Math.pow(1 + inrGrowth, 5)),
        fiveYearAud:
          currencyRate ? Math.round(market.midInr * Math.pow(1 + audGrowth, 5) * currencyRate) : undefined,
        label: "Illustrative 5-year scenario, not a market forecast",
      },
      costs: body.purpose === "sell" ? saleCosts(market.midInr) : undefined,
      disclaimer:
        "This is an indicative automated estimate based on current 99acres asking listings collected through Apify. Asking prices may differ from achieved rent or sale prices. It is not a formal valuation, tax opinion or guaranteed result.",
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "The estimate could not be completed." },
      { status: 424 },
    )
  }
}
