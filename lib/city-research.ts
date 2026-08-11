export type CityProfile = {
  slug: string
  city: string
  state: string
  region: string
  tagline: string
  summary: string
  nriFit: string
  score: number
  recommendation: "Priority market" | "Selective opportunity" | "Lifestyle-led" | "Watchlist"
  indicators: Array<{ label: string; value: string; note: string; tone?: "blue" | "saffron" | "red" | "green" }>
  drivers: string[]
  risks: string[]
  corridors: Array<{ name: string; fit: string; note: string }>
  propertyTypes: Array<{ type: string; fit: string; note: string }>
  nriChecklist: string[]
  sources: Array<{ name: string; url: string; note: string }>
  searchTerms: string[]
}


const commonSources = {
  nhb: { name: "NHB RESIDEX", url: "https://residex.nhbonline.org.in/", note: "Official housing-price index framework where covered." },
  knightFrank: { name: "Knight Frank India Research", url: "https://www.knightfrank.co.in/research", note: "Professional residential and commercial market context." },
}

function makeCityProfile(input: Omit<CityProfile, "indicators" | "propertyTypes" | "nriChecklist" | "sources"> & {
  growth: string
  rental: string
  liquidity: string
  riskLabel: string
  riskNote: string
  rera: { name: string; url: string }
}): CityProfile {
  return {
    ...input,
    indicators: [
      { label: "Growth profile", value: input.growth, note: "Infrastructure, jobs and end-user demand", tone: input.growth.includes("High") ? "green" : "saffron" },
      { label: "Rental depth", value: input.rental, note: "Varies sharply by micro-market", tone: input.rental.includes("High") ? "green" : "blue" },
      { label: "Liquidity", value: input.liquidity, note: "Completed and occupied stock is preferred", tone: "blue" },
      { label: input.riskLabel, value: "Review", note: input.riskNote, tone: "red" },
    ],
    propertyTypes: [
      { type: "Completed apartment", fit: "Preferred", note: "Simpler inspection, finance, rental and remote management." },
      { type: "New launch", fit: "Selective", note: "Proceed only after RERA, approvals, escrow and delivery review." },
      { type: "Plot or independent house", fit: "Specialist", note: "Requires stronger title, access and maintenance due diligence." },
    ],
    nriChecklist: [
      "Verify RERA registration, title and phase-specific approvals",
      "Compare registered resale evidence with quoted launch pricing",
      "Inspect occupancy, maintenance quality and realistic rental demand",
      "Plan Power of Attorney, banking, TDS and registration steps early",
      "Appoint independent legal and local property-management support",
    ],
    sources: [
      commonSources.nhb,
      { name: input.rera.name, url: input.rera.url, note: "Project and promoter verification." },
      commonSources.knightFrank,
    ],
  }
}

export const cityProfiles: CityProfile[] = [
  {
    slug: "noida",
    city: "Noida",
    state: "Uttar Pradesh",
    region: "Delhi NCR",
    tagline: "Infrastructure-led NCR growth with strong new-development depth.",
    summary: "Noida offers a broad mix of established residential sectors, expressway-led growth corridors and large developer projects. NRI buyers should separate end-user locations from speculative launch zones and verify delivery, title and rental depth carefully.",
    nriFit: "Best suited to NRIs seeking professionally managed apartments, NCR connectivity and access to large organised developers.",
    score: 86,
    recommendation: "Priority market",
    indicators: [
      { label: "Growth profile", value: "High", note: "Infrastructure and employment-linked", tone: "green" },
      { label: "Rental depth", value: "Medium–High", note: "Sector and metro access matter", tone: "blue" },
      { label: "Liquidity", value: "High", note: "Stronger in completed, occupied projects", tone: "blue" },
      { label: "Execution risk", value: "Medium", note: "Developer and phase selection critical", tone: "red" },
    ],
    drivers: ["Noida–Greater Noida Expressway", "Jewar airport influence corridor", "Metro expansion and road connectivity", "IT, data centre and office development", "Large organised residential supply"],
    risks: ["Oversupply in selected micro-markets", "Long delivery timelines in new phases", "Rental yield may lag capital values", "Project-specific legal and maintenance quality"],
    corridors: [
      { name: "Central Noida", fit: "End-user and rental", note: "Established sectors, stronger amenities and liquidity." },
      { name: "Noida Expressway", fit: "Growth and corporate access", note: "Compare occupancy, metro access and delivered social infrastructure." },
      { name: "Greater Noida West", fit: "Value-led", note: "Affordability can be attractive, but project quality and supply require care." },
      { name: "Yamuna Expressway", fit: "Long-horizon", note: "Infrastructure-led potential with higher holding and execution risk." },
    ],
    propertyTypes: [
      { type: "Completed apartment", fit: "Strong", note: "Easier to inspect, rent and finance remotely." },
      { type: "New launch", fit: "Selective", note: "Use only after developer, escrow, approvals and timeline review." },
      { type: "Plot", fit: "Specialist", note: "Higher documentation and maintenance oversight." },
    ],
    nriChecklist: ["Verify UP-RERA registration and phase", "Review title, dues and possession status", "Compare actual occupancy—not only launch sales", "Model maintenance charges and vacancy", "Plan PoA and registration process early"],
    sources: [
      { name: "NHB RESIDEX", url: "https://residex.nhbonline.org.in/", note: "Official city housing-price index framework." },
      { name: "Knight Frank India Research", url: "https://www.knightfrank.co.in/research", note: "NCR residential and office-market context." },
      { name: "UP RERA", url: "https://www.up-rera.in/", note: "Project and promoter verification." },
    ],
    searchTerms: ["Noida property", "Noida real estate", "Noida airport property", "Noida NRI investment"],
  },
  {
    slug: "gurugram",
    city: "Gurugram",
    state: "Haryana",
    region: "Delhi NCR",
    tagline: "Corporate demand, premium housing and deep rental catchments.",
    summary: "Gurugram remains one of India’s strongest corporate-led residential markets, but pricing, project quality and corridor selection vary sharply. NRIs often benefit from focusing on completed or near-completed projects with proven rental demand.",
    nriFit: "Strong for premium apartments, corporate rentals and investors prioritising liquidity over entry-level affordability.",
    score: 88,
    recommendation: "Priority market",
    indicators: [
      { label: "Growth profile", value: "High", note: "Corporate and infrastructure driven", tone: "green" },
      { label: "Rental depth", value: "High", note: "Corporate and executive demand", tone: "green" },
      { label: "Liquidity", value: "High", note: "Premium projects can remain liquid", tone: "blue" },
      { label: "Entry cost", value: "High", note: "Affordability and yield discipline needed", tone: "red" },
    ],
    drivers: ["Corporate office concentration", "Dwarka Expressway", "Golf Course Road ecosystem", "Airport connectivity", "Premium residential and rental demand"],
    risks: ["High entry prices", "Traffic and civic-infrastructure variation", "Large maintenance charges", "Developer and project-level execution differences"],
    corridors: [
      { name: "Golf Course Road", fit: "Premium rental", note: "Established executive demand and strong amenities." },
      { name: "Golf Course Extension", fit: "Growth premium", note: "Broader new supply; compare completion and access." },
      { name: "Dwarka Expressway", fit: "Infrastructure-led", note: "Strong visibility but selection and entry price matter." },
      { name: "New Gurugram", fit: "Value-growth", note: "Longer commute and social infrastructure vary by sector." },
    ],
    propertyTypes: [
      { type: "Premium apartment", fit: "Strong", note: "Corporate rental and resale depth in established locations." },
      { type: "Builder floor", fit: "Selective", note: "Title, construction, parking and maintenance need review." },
      { type: "New launch", fit: "Selective", note: "Avoid buying on brand alone; compare delivered evidence." },
    ],
    nriChecklist: ["Verify HRERA and licence status", "Check actual corporate-rental evidence", "Model common-area maintenance", "Review road access and water/power arrangements", "Compare resale alternatives before booking"],
    sources: [
      { name: "NHB RESIDEX", url: "https://residex.nhbonline.org.in/", note: "Official housing-price tracking." },
      { name: "Knight Frank India Research", url: "https://www.knightfrank.co.in/research", note: "NCR demand and office-market context." },
      { name: "Haryana RERA", url: "https://haryanarera.gov.in/", note: "Project and promoter verification." },
    ],
    searchTerms: ["Gurugram property", "Gurgaon real estate", "Dwarka Expressway property", "Gurugram NRI investment"],
  },
  {
    slug: "lucknow",
    city: "Lucknow",
    state: "Uttar Pradesh",
    region: "Uttar Pradesh",
    tagline: "A lower-entry capital city with expanding infrastructure and end-user demand.",
    summary: "Lucknow combines administrative employment, education, healthcare and growing infrastructure. It can suit NRIs seeking a lower ticket size than NCR, but rental depth and resale liquidity are highly micro-market dependent.",
    nriFit: "Suitable for patient investors and families with local connections who can prioritise established corridors and management quality.",
    score: 78,
    recommendation: "Selective opportunity",
    indicators: [
      { label: "Growth profile", value: "Medium–High", note: "Infrastructure and end-user led", tone: "green" },
      { label: "Rental depth", value: "Medium", note: "Near institutions and employment", tone: "blue" },
      { label: "Liquidity", value: "Medium", note: "Project and corridor dependent", tone: "saffron" },
      { label: "Entry cost", value: "Moderate", note: "Lower than NCR premium markets", tone: "green" },
    ],
    drivers: ["State capital economy", "Healthcare and education demand", "Metro and road upgrades", "Gomti Nagar ecosystem", "End-user housing demand"],
    risks: ["Slower resale outside preferred corridors", "Rental demand is not uniform", "Peripheral plots need stronger due diligence", "Smaller local developers can increase execution risk"],
    corridors: [
      { name: "Gomti Nagar", fit: "Established", note: "Strong amenities, offices and resale recognition." },
      { name: "Gomti Nagar Extension", fit: "Growth", note: "Newer supply; compare possession and connectivity." },
      { name: "Sultanpur Road", fit: "Long-horizon", note: "Infrastructure-led but variable project maturity." },
      { name: "Shaheed Path", fit: "Balanced", note: "Connectivity and newer residential development." },
    ],
    propertyTypes: [
      { type: "Completed apartment", fit: "Strong", note: "Best option for remote ownership and evidence-based evaluation." },
      { type: "Plot", fit: "Selective", note: "Use only with title, access and development verification." },
      { type: "Independent house", fit: "Lifestyle", note: "Maintenance and tenant-management burden is higher." },
    ],
    nriChecklist: ["Verify UP-RERA where applicable", "Prioritise occupied neighbourhoods", "Check local rental comparables", "Confirm municipal and development-authority status", "Avoid relying only on future infrastructure promises"],
    sources: [
      { name: "NHB RESIDEX", url: "https://residex.nhbonline.org.in/", note: "Official city-level housing-price framework." },
      { name: "UP RERA", url: "https://www.up-rera.in/", note: "Project verification." },
      { name: "Knight Frank India Research", url: "https://www.knightfrank.co.in/research", note: "National and regional context." },
    ],
    searchTerms: ["Lucknow property", "Gomti Nagar real estate", "Lucknow NRI investment"],
  },
  {
    slug: "jaipur",
    city: "Jaipur",
    state: "Rajasthan",
    region: "Rajasthan",
    tagline: "Tourism, services and infrastructure supporting a broad residential market.",
    summary: "Jaipur has a diverse economy and a mix of end-user, investor and lifestyle demand. The strongest NRI opportunities generally sit in established or clearly developing corridors rather than isolated plotted schemes.",
    nriFit: "Good for value-conscious buyers, families with Rajasthan links and investors seeking a diversified Tier-2 city.",
    score: 80,
    recommendation: "Selective opportunity",
    indicators: [
      { label: "Growth profile", value: "Medium–High", note: "Diversified city economy", tone: "green" },
      { label: "Rental depth", value: "Medium", note: "Stronger near employment and education", tone: "blue" },
      { label: "Liquidity", value: "Medium–High", note: "Established corridors perform better", tone: "blue" },
      { label: "Plot risk", value: "Medium–High", note: "Approval and access verification critical", tone: "red" },
    ],
    drivers: ["Tourism and hospitality", "Education and healthcare", "Delhi–Mumbai Industrial Corridor influence", "Ring-road and airport connectivity", "Government and service employment"],
    risks: ["Peripheral plotted oversupply", "Water and civic-infrastructure variation", "Rental yields vary widely", "Unapproved schemes and title complexity"],
    corridors: [
      { name: "Ajmer Road", fit: "Growth-value", note: "Large supply; compare delivered amenities and access." },
      { name: "Jagatpura", fit: "Rental and end-user", note: "Education, healthcare and airport-side demand." },
      { name: "Vaishali Nagar", fit: "Established premium", note: "Strong amenities and resale recognition." },
      { name: "Tonk Road", fit: "Connectivity", note: "Airport and commercial access; product quality varies." },
    ],
    propertyTypes: [
      { type: "Apartment", fit: "Strong", note: "Easier remote management in established communities." },
      { type: "Villa", fit: "Selective", note: "Lifestyle appeal with higher upkeep." },
      { type: "Plot", fit: "Specialist", note: "Approval, title, access and holding costs need careful review." },
    ],
    nriChecklist: ["Verify RERA and development approvals", "Check water and road access", "Use registered market comparables", "Review society maintenance and occupancy", "Confirm property-tax and title records"],
    sources: [
      { name: "NHB RESIDEX", url: "https://residex.nhbonline.org.in/", note: "Official housing-price index." },
      { name: "Rajasthan RERA", url: "https://rera.rajasthan.gov.in/", note: "Project and promoter verification." },
      { name: "Knight Frank India Research", url: "https://www.knightfrank.co.in/research", note: "Market research context." },
    ],
    searchTerms: ["Jaipur property", "Jaipur real estate", "Jagatpura property", "Jaipur NRI investment"],
  },
  {
    slug: "chandigarh-tricity",
    city: "Chandigarh Tricity",
    state: "Chandigarh / Punjab / Haryana",
    region: "Punjab–Haryana",
    tagline: "A supply-constrained core supported by Mohali and Panchkula growth.",
    summary: "The Tricity market combines the established Chandigarh core with expanding Mohali and Panchkula corridors. NRI demand is meaningful, particularly among Punjabi families, but project jurisdiction and authority approvals differ across the region.",
    nriFit: "Strong for diaspora buyers seeking family use, premium housing and long-term ownership in a recognised North Indian market.",
    score: 83,
    recommendation: "Priority market",
    indicators: [
      { label: "Growth profile", value: "Medium–High", note: "Supply constraints and regional growth", tone: "green" },
      { label: "Rental depth", value: "Medium–High", note: "Education, IT and professional demand", tone: "blue" },
      { label: "Liquidity", value: "High", note: "Established sectors and quality projects", tone: "blue" },
      { label: "Jurisdiction risk", value: "Medium", note: "Authority and state rules differ", tone: "red" },
    ],
    drivers: ["Supply-constrained Chandigarh core", "Mohali IT and airport corridor", "Education and healthcare", "Strong diaspora demand", "Regional administrative economy"],
    risks: ["High pricing in preferred locations", "Multiple regulatory jurisdictions", "Peripheral plotted schemes", "Rental yield may be modest in premium stock"],
    corridors: [
      { name: "Chandigarh sectors", fit: "Capital preservation", note: "Limited supply and high entry cost." },
      { name: "Airport Road Mohali", fit: "Growth", note: "Large project pipeline; selection and occupancy matter." },
      { name: "New Chandigarh", fit: "Long-horizon", note: "Planned development with execution and holding risk." },
      { name: "Panchkula", fit: "Established lifestyle", note: "End-user focus and strong civic environment." },
    ],
    propertyTypes: [
      { type: "Completed apartment", fit: "Strong", note: "Good for remote ownership and tenant management." },
      { type: "Independent house", fit: "Lifestyle", note: "High entry and maintenance burden." },
      { type: "Plot", fit: "Selective", note: "Authority approval and title review essential." },
    ],
    nriChecklist: ["Identify the exact regulatory authority", "Verify RERA and licence status", "Compare Chandigarh, Mohali and Panchkula separately", "Review possession and occupancy", "Plan local management before purchase"],
    sources: [
      { name: "NHB RESIDEX", url: "https://residex.nhbonline.org.in/", note: "Official city housing-price index." },
      { name: "Punjab RERA", url: "https://rera.punjab.gov.in/", note: "Punjab project verification." },
      { name: "Haryana RERA", url: "https://haryanarera.gov.in/", note: "Haryana project verification." },
    ],
    searchTerms: ["Chandigarh property", "Mohali property", "New Chandigarh real estate", "Tricity NRI property"],
  },
  {
    slug: "dehradun",
    city: "Dehradun",
    state: "Uttarakhand",
    region: "Uttarakhand",
    tagline: "Lifestyle and education demand with strong due-diligence needs.",
    summary: "Dehradun attracts end users, retirees, families and second-home buyers. Its investment case is more lifestyle-led than pure rental-yield driven, and buyers should be disciplined about land-use, access, water, slope and development permissions.",
    nriFit: "Best for NRIs seeking family use, retirement or a managed second home rather than purely passive high-yield investment.",
    score: 76,
    recommendation: "Lifestyle-led",
    indicators: [
      { label: "Growth profile", value: "Medium", note: "Lifestyle and end-user led", tone: "saffron" },
      { label: "Rental depth", value: "Medium", note: "Education and local employment", tone: "blue" },
      { label: "Liquidity", value: "Medium", note: "Location and product dependent", tone: "saffron" },
      { label: "Due-diligence risk", value: "High", note: "Land-use and terrain issues", tone: "red" },
    ],
    drivers: ["Education and institutional presence", "Retirement and lifestyle demand", "Delhi–Dehradun connectivity", "Healthcare and services", "Gateway to hill destinations"],
    risks: ["Land-use and conversion issues", "Flood, drainage and slope concerns", "Fragmented local supply", "Second-home maintenance and vacancy"],
    corridors: [
      { name: "Rajpur Road", fit: "Established premium", note: "Lifestyle and amenity access with higher prices." },
      { name: "Sahastradhara Road", fit: "Growth-lifestyle", note: "Views and new development; drainage and access matter." },
      { name: "Mussoorie Road", fit: "Second home", note: "Scenic premium with terrain and management considerations." },
      { name: "Haridwar Road", fit: "Value and connectivity", note: "More urban and infrastructure-led demand." },
    ],
    propertyTypes: [
      { type: "Apartment", fit: "Strong", note: "Simpler for remote maintenance and security." },
      { type: "Villa", fit: "Lifestyle", note: "Inspect drainage, construction and upkeep requirements." },
      { type: "Land", fit: "High caution", note: "Use specialist title and land-use due diligence." },
    ],
    nriChecklist: ["Verify land-use and development authority approvals", "Assess flood, drainage and slope risk", "Inspect access and utilities", "Plan year-round maintenance", "Avoid buying solely from scenic marketing"],
    sources: [
      { name: "NHB RESIDEX", url: "https://residex.nhbonline.org.in/", note: "Official housing-price index framework." },
      { name: "Uttarakhand RERA", url: "https://uhuda.uk.gov.in/pages/display/92-real-estate-regulatory-authority", note: "Regulatory and project information." },
      { name: "Knight Frank India Research", url: "https://www.knightfrank.co.in/research", note: "National property-market context." },
    ],
    searchTerms: ["Dehradun property", "Dehradun real estate", "Uttarakhand second home", "Dehradun NRI investment"],
  },
  {
    slug: "amritsar",
    city: "Amritsar",
    state: "Punjab",
    region: "Punjab",
    tagline: "Diaspora-linked housing demand with a strongly local market structure.",
    summary: "Amritsar benefits from diaspora connections, tourism, trade and family-driven housing demand. It is less institutional than NCR, so reliable local execution and title diligence are particularly important.",
    nriFit: "Best for Punjabi diaspora buyers with family, business or long-term use objectives and strong local management support.",
    score: 72,
    recommendation: "Watchlist",
    indicators: [
      { label: "Growth profile", value: "Medium", note: "Local and diaspora demand", tone: "saffron" },
      { label: "Rental depth", value: "Low–Medium", note: "Highly micro-market dependent", tone: "saffron" },
      { label: "Liquidity", value: "Medium", note: "Established urban locations preferred", tone: "blue" },
      { label: "Local execution", value: "Critical", note: "Fragmented market and informal practices", tone: "red" },
    ],
    drivers: ["Diaspora and family demand", "Tourism and hospitality", "Trade and services", "Established urban housing", "Regional cultural importance"],
    risks: ["Limited institutional data", "Lower rental depth", "Informal brokerage and documentation practices", "Peripheral land and approval risk"],
    corridors: [
      { name: "Ranjit Avenue", fit: "Established premium", note: "Strong recognition, amenities and end-user demand." },
      { name: "Airport Road", fit: "Growth-lifestyle", note: "Diaspora appeal; compare actual development." },
      { name: "GT Road corridors", fit: "Mixed use", note: "Access and commercial influence vary by location." },
      { name: "Peripheral plotted areas", fit: "High caution", note: "Title, approval and infrastructure verification essential." },
    ],
    propertyTypes: [
      { type: "Independent house", fit: "Family use", note: "Common diaspora preference with higher management burden." },
      { type: "Apartment", fit: "Selective", note: "Useful for security and remote ownership where quality stock exists." },
      { type: "Plot", fit: "High caution", note: "Local legal and planning diligence is critical." },
    ],
    nriChecklist: ["Use independent title verification", "Confirm municipal and colony approvals", "Document all payments", "Assess realistic rental and resale demand", "Appoint a local management contact"],
    sources: [
      { name: "NHB RESIDEX", url: "https://residex.nhbonline.org.in/", note: "Official price-index framework where covered." },
      { name: "Punjab RERA", url: "https://rera.punjab.gov.in/", note: "Project and promoter verification." },
      { name: "Knight Frank India Research", url: "https://www.knightfrank.co.in/research", note: "Broader market context." },
    ],
    searchTerms: ["Amritsar property", "Punjab NRI property", "Amritsar real estate"],
  },
  makeCityProfile({
    slug: "delhi", city: "Delhi", state: "Delhi", region: "Delhi NCR", score: 84, recommendation: "Priority market",
    tagline: "A supply-constrained capital market led by established neighbourhoods and redevelopment.",
    summary: "Delhi is primarily an end-user and capital-preservation market rather than a conventional new-launch market. NRI buyers should focus on clean title, sanctioned construction, parking, redevelopment terms and realistic rental demand.",
    nriFit: "Best for buyers prioritising family use, established locations and long-term capital preservation.",
    growth: "Medium–High", rental: "High", liquidity: "High", riskLabel: "Title risk", riskNote: "Builder floors and redevelopment need specialist checks",
    drivers: ["National capital employment", "Metro connectivity", "Limited land in established colonies", "Education and healthcare", "Redevelopment demand"],
    risks: ["Title and floor-sanction complexity", "Older-building maintenance", "High entry cost", "Parking and access constraints"],
    corridors: [
      { name: "South Delhi", fit: "Premium end-user", note: "Strong amenity depth with high entry cost and varied builder-floor quality." },
      { name: "Dwarka", fit: "Apartment-led", note: "Planned sectors, airport access and established societies." },
      { name: "West Delhi", fit: "Family and rental", note: "Deep local demand; street and building quality vary." },
      { name: "North Delhi", fit: "Established", note: "University, business and family demand with limited organised supply." },
    ],
    rera: { name: "Delhi RERA", url: "https://rera.delhi.gov.in/" }, searchTerms: ["Delhi property", "Delhi real estate", "Delhi NRI property"]
  }),
  makeCityProfile({
    slug: "greater-noida", city: "Greater Noida", state: "Uttar Pradesh", region: "Delhi NCR", score: 82, recommendation: "Selective opportunity",
    tagline: "Planned infrastructure, institutional land and airport-corridor optionality.",
    summary: "Greater Noida offers comparatively lower entry prices and a large infrastructure pipeline. The investment case depends on choosing occupied nodes and avoiding purely speculative peripheral supply.",
    nriFit: "Suitable for patient investors seeking larger homes or long-horizon NCR exposure.",
    growth: "High", rental: "Medium", liquidity: "Medium–High", riskLabel: "Supply risk", riskNote: "Large pipeline and uneven occupancy",
    drivers: ["Jewar airport corridor", "Expressway network", "Education and institutional clusters", "Industrial and data-centre activity", "Planned urban sectors"],
    risks: ["Peripheral oversupply", "Long holding periods", "Project delivery variation", "Weak rental depth in new sectors"],
    corridors: [
      { name: "Greater Noida core", fit: "End-user", note: "Established sectors and social infrastructure." },
      { name: "Noida Extension", fit: "Value apartment", note: "Large occupied base but project quality varies." },
      { name: "Yamuna Expressway", fit: "Long-horizon", note: "Airport-led potential with higher execution risk." },
      { name: "Pari Chowk", fit: "Established node", note: "Transit, education and civic amenity access." },
    ],
    rera: { name: "UP RERA", url: "https://www.up-rera.in/" }, searchTerms: ["Greater Noida property", "Jewar airport property", "Noida Extension"]
  }),
  makeCityProfile({
    slug: "ghaziabad", city: "Ghaziabad", state: "Uttar Pradesh", region: "Delhi NCR", score: 76, recommendation: "Selective opportunity",
    tagline: "Affordable NCR access supported by metro, expressways and established housing catchments.",
    summary: "Ghaziabad provides lower-ticket NCR housing with strong end-user demand in selected corridors. NRI investors should prioritise occupied societies, connectivity and credible maintenance over headline affordability.",
    nriFit: "Good for value-conscious NCR buyers with family or rental demand in eastern Delhi.",
    growth: "Medium–High", rental: "Medium–High", liquidity: "Medium–High", riskLabel: "Quality risk", riskNote: "Society and civic infrastructure vary",
    drivers: ["Delhi connectivity", "Metro and RRTS", "Expressways", "Large end-user population", "Affordable apartment stock"],
    risks: ["Civic-infrastructure variation", "Project maintenance quality", "Traffic and pollution", "Peripheral oversupply"],
    corridors: [
      { name: "Indirapuram", fit: "Established rental", note: "Deep occupancy and Delhi access." },
      { name: "Vaishali", fit: "Metro-led", note: "Strong connectivity with older stock." },
      { name: "Raj Nagar Extension", fit: "Value-growth", note: "Newer supply; compare occupancy and access." },
      { name: "Siddharth Vihar", fit: "Selective", note: "Infrastructure-led apartment market." },
    ],
    rera: { name: "UP RERA", url: "https://www.up-rera.in/" }, searchTerms: ["Ghaziabad property", "Indirapuram real estate", "Raj Nagar Extension"]
  }),
  makeCityProfile({
    slug: "faridabad", city: "Faridabad", state: "Haryana", region: "Delhi NCR", score: 75, recommendation: "Selective opportunity",
    tagline: "An industrial NCR city with metro connectivity and selective premium corridors.",
    summary: "Faridabad combines established industrial employment with newer residential sectors. The strongest opportunities are generally near proven transport and end-user catchments rather than isolated launch zones.",
    nriFit: "Suitable for buyers seeking comparatively affordable South NCR access.",
    growth: "Medium–High", rental: "Medium", liquidity: "Medium", riskLabel: "Execution risk", riskNote: "New sectors need access and occupancy checks",
    drivers: ["Industrial employment", "Delhi Metro", "Delhi–Mumbai Expressway links", "Established city demand", "Greater Faridabad expansion"],
    risks: ["Uneven civic infrastructure", "Lower rental depth in peripheral sectors", "Developer quality variation", "Pollution and commute"],
    corridors: [
      { name: "Greater Faridabad", fit: "Growth-value", note: "Newer sectors with variable occupancy." },
      { name: "Sector 21–28", fit: "Established", note: "End-user and family demand." },
      { name: "Surajkund", fit: "Premium lifestyle", note: "Delhi proximity and limited premium stock." },
      { name: "NIT Faridabad", fit: "Local demand", note: "Dense established market with mixed stock." },
    ],
    rera: { name: "Haryana RERA", url: "https://haryanarera.gov.in/" }, searchTerms: ["Faridabad property", "Greater Faridabad real estate"]
  }),
  makeCityProfile({
    slug: "mohali", city: "Mohali", state: "Punjab", region: "Punjab–Haryana", score: 84, recommendation: "Priority market",
    tagline: "Tricity growth driven by IT, airport connectivity, education and diaspora demand.",
    summary: "Mohali is the principal expansion market of Chandigarh Tricity, with organised apartments, plotted development and institutional demand. Jurisdiction, licence and occupancy checks remain essential.",
    nriFit: "Strong for Punjabi diaspora buyers seeking modern communities and long-term Tricity exposure.",
    growth: "High", rental: "Medium–High", liquidity: "High", riskLabel: "Approval risk", riskNote: "Project jurisdiction and licence must be verified",
    drivers: ["IT City", "International airport", "Education and healthcare", "Chandigarh spillover", "Strong diaspora ownership"],
    risks: ["Peripheral project oversupply", "Multiple authority approvals", "Moderate rental yields", "Delayed amenities"],
    corridors: [
      { name: "Airport Road", fit: "Growth", note: "Major apartment and commercial corridor." },
      { name: "IT City", fit: "Employment-led", note: "Long-term corporate and residential potential." },
      { name: "Aerocity", fit: "Premium", note: "Airport access with higher entry pricing." },
      { name: "Kharar", fit: "Affordable", note: "Large supply; traffic and project quality require care." },
    ],
    rera: { name: "Punjab RERA", url: "https://rera.punjab.gov.in/" }, searchTerms: ["Mohali property", "Airport Road Mohali", "Mohali NRI investment"]
  }),
  makeCityProfile({
    slug: "zirakpur", city: "Zirakpur", state: "Punjab", region: "Punjab–Haryana", score: 74, recommendation: "Selective opportunity",
    tagline: "Affordable Tricity apartments with strong connectivity but heavy supply.",
    summary: "Zirakpur attracts value-led buyers due to airport and highway access. NRI investors should be highly selective about drainage, traffic, occupancy, maintenance and developer delivery.",
    nriFit: "Best for lower-ticket Tricity exposure where rental and management evidence is clear.",
    growth: "Medium", rental: "Medium", liquidity: "Medium", riskLabel: "Oversupply risk", riskNote: "Large apartment pipeline and civic pressure",
    drivers: ["Airport proximity", "Highway connectivity", "Chandigarh spillover", "Affordable apartments", "Retail and hospitality"],
    risks: ["Oversupply", "Drainage and traffic", "Variable construction quality", "Weak differentiation among projects"],
    corridors: [
      { name: "VIP Road", fit: "Established apartment", note: "High occupancy but traffic and density matter." },
      { name: "Patiala Road", fit: "Growth-value", note: "Large new supply and mixed maturity." },
      { name: "Ambala Highway", fit: "Connectivity", note: "Commercial access and apartment clusters." },
      { name: "PR-7 corridor", fit: "Long-horizon", note: "Infrastructure-led selection required." },
    ],
    rera: { name: "Punjab RERA", url: "https://rera.punjab.gov.in/" }, searchTerms: ["Zirakpur property", "VIP Road Zirakpur", "Tricity apartments"]
  }),
  makeCityProfile({
    slug: "panchkula", city: "Panchkula", state: "Haryana", region: "Punjab–Haryana", score: 81, recommendation: "Priority market",
    tagline: "A planned, established Tricity market focused on end users and capital preservation.",
    summary: "Panchkula offers strong civic amenity, established sectors and limited premium supply. It is generally more suitable for family use and capital preservation than high rental yield.",
    nriFit: "Strong for diaspora families seeking a well-managed, established Tricity location.",
    growth: "Medium–High", rental: "Medium", liquidity: "High", riskLabel: "Entry cost", riskNote: "Premium pricing can compress yield",
    drivers: ["Planned sectors", "Chandigarh proximity", "Healthcare and education", "Limited quality supply", "End-user demand"],
    risks: ["High entry cost", "Low rental yield", "Limited new stock", "Older property maintenance"],
    corridors: [
      { name: "Central sectors", fit: "Capital preservation", note: "Established amenities and strong end-user demand." },
      { name: "MDC", fit: "Premium", note: "Chandigarh-adjacent residential market." },
      { name: "Pinjore–Kalka edge", fit: "Selective", note: "Lifestyle and affordability with lower liquidity." },
      { name: "Sector 20", fit: "Apartment-led", note: "Established high-rise and family demand." },
    ],
    rera: { name: "Haryana RERA", url: "https://haryanarera.gov.in/" }, searchTerms: ["Panchkula property", "Panchkula real estate"]
  }),
  makeCityProfile({
    slug: "ludhiana", city: "Ludhiana", state: "Punjab", region: "Punjab", score: 73, recommendation: "Watchlist",
    tagline: "Industrial wealth and family demand in a locally driven property market.",
    summary: "Ludhiana has a strong industrial economy and substantial local purchasing power. However, the market is fragmented and rental depth is lower than major service-sector cities.",
    nriFit: "Best for diaspora buyers with local family, business or long-term use requirements.",
    growth: "Medium", rental: "Low–Medium", liquidity: "Medium", riskLabel: "Local-market risk", riskNote: "Independent verification is critical",
    drivers: ["Manufacturing and textiles", "Local business wealth", "Diaspora demand", "Healthcare and education", "Established urban housing"],
    risks: ["Fragmented pricing", "Lower rental depth", "Informal transactions", "Peripheral colony approvals"],
    corridors: [
      { name: "Pakhowal Road", fit: "Premium growth", note: "Newer residential and lifestyle demand." },
      { name: "Ferozepur Road", fit: "Established", note: "Commercial and residential depth." },
      { name: "South City", fit: "Family use", note: "Larger homes and local premium demand." },
      { name: "Canal Road", fit: "Selective", note: "Newer development with approval checks." },
    ],
    rera: { name: "Punjab RERA", url: "https://rera.punjab.gov.in/" }, searchTerms: ["Ludhiana property", "Punjab NRI real estate"]
  }),
  makeCityProfile({
    slug: "jalandhar", city: "Jalandhar", state: "Punjab", region: "Punjab", score: 71, recommendation: "Watchlist",
    tagline: "A diaspora-linked city where family use outweighs institutional investment demand.",
    summary: "Jalandhar benefits from strong overseas family connections, education, healthcare and local commerce. NRI buyers need trusted local execution and realistic expectations on rental and resale timelines.",
    nriFit: "Most suitable for family-linked purchases and long-term ownership rather than yield-led investing.",
    growth: "Medium", rental: "Low–Medium", liquidity: "Medium", riskLabel: "Documentation risk", riskNote: "Local title and colony approvals need care",
    drivers: ["Diaspora links", "Sports-goods industry", "Education and healthcare", "Local commerce", "Family housing demand"],
    risks: ["Low institutional data", "Limited rental market", "Peripheral land risk", "Informal brokerage"],
    corridors: [
      { name: "Model Town", fit: "Established premium", note: "Strong local recognition and amenities." },
      { name: "Urban Estate", fit: "Family use", note: "Planned residential sectors." },
      { name: "Nakodar Road", fit: "Growth", note: "New development with approval checks." },
      { name: "Phagwara Road", fit: "Selective", note: "Connectivity-led mixed development." },
    ],
    rera: { name: "Punjab RERA", url: "https://rera.punjab.gov.in/" }, searchTerms: ["Jalandhar property", "Punjab NRI property"]
  }),
  makeCityProfile({
    slug: "kanpur", city: "Kanpur", state: "Uttar Pradesh", region: "Uttar Pradesh", score: 72, recommendation: "Watchlist",
    tagline: "A large industrial city with affordable housing and selective corridor growth.",
    summary: "Kanpur has a substantial population, industrial base and improving transport. Property demand is predominantly local, making micro-market selection and exit planning especially important for NRIs.",
    nriFit: "Suitable for buyers with local links or a clear end-user strategy.",
    growth: "Medium", rental: "Medium", liquidity: "Medium", riskLabel: "Liquidity risk", riskNote: "Resale can be slow outside established areas",
    drivers: ["Industrial economy", "Education institutions", "Metro investment", "Large end-user base", "Affordable entry cost"],
    risks: ["Slower premium resale", "Pollution and civic variation", "Fragmented developer quality", "Peripheral land risk"],
    corridors: [
      { name: "Civil Lines", fit: "Established premium", note: "Central amenity and institutional demand." },
      { name: "Swaroop Nagar", fit: "Family and rental", note: "Healthcare and established residential demand." },
      { name: "Kalyanpur", fit: "Education-led", note: "Student and institutional catchments." },
      { name: "Shyam Nagar", fit: "Value", note: "Affordable housing with local demand." },
    ],
    rera: { name: "UP RERA", url: "https://www.up-rera.in/" }, searchTerms: ["Kanpur property", "Kanpur real estate"]
  }),
  makeCityProfile({
    slug: "varanasi", city: "Varanasi", state: "Uttar Pradesh", region: "Uttar Pradesh", score: 77, recommendation: "Selective opportunity",
    tagline: "Tourism, pilgrimage and infrastructure growth with highly localised demand.",
    summary: "Varanasi has rising visibility from tourism, pilgrimage and urban infrastructure. Investment returns depend on location, access, land-use and whether the asset serves residential, hospitality or family-use demand.",
    nriFit: "Good for buyers with family, spiritual, hospitality or long-horizon objectives.",
    growth: "Medium–High", rental: "Medium", liquidity: "Medium", riskLabel: "Land-use risk", riskNote: "Access and approval checks are essential",
    drivers: ["Pilgrimage and tourism", "Airport and road connectivity", "Healthcare and education", "Government infrastructure", "Regional commercial demand"],
    risks: ["Narrow access roads", "Land-use complexity", "Highly local pricing", "Seasonal hospitality demand"],
    corridors: [
      { name: "Shivpur", fit: "Residential growth", note: "Airport-side expansion and local demand." },
      { name: "Sarnath", fit: "Tourism-lifestyle", note: "Hospitality and residential potential with zoning care." },
      { name: "Babatpur Road", fit: "Long-horizon", note: "Airport corridor with variable maturity." },
      { name: "Lanka", fit: "Education-rental", note: "BHU and healthcare catchments." },
    ],
    rera: { name: "UP RERA", url: "https://www.up-rera.in/" }, searchTerms: ["Varanasi property", "Banaras real estate"]
  }),
  makeCityProfile({
    slug: "prayagraj", city: "Prayagraj", state: "Uttar Pradesh", region: "Uttar Pradesh", score: 69, recommendation: "Watchlist",
    tagline: "Administrative, education and pilgrimage demand with limited institutional depth.",
    summary: "Prayagraj has stable government, education and family demand, but a less liquid organised property market. NRIs should favour established neighbourhoods and clear end-user cases.",
    nriFit: "Best for family use or locally supported long-term ownership.",
    growth: "Medium", rental: "Medium", liquidity: "Low–Medium", riskLabel: "Market-depth risk", riskNote: "Limited organised resale evidence",
    drivers: ["Government employment", "Education", "Pilgrimage", "Regional services", "Transport investment"],
    risks: ["Lower liquidity", "Fragmented pricing", "Limited organised developers", "Land and colony approvals"],
    corridors: [
      { name: "Civil Lines", fit: "Established premium", note: "Central services and administrative demand." },
      { name: "Naini", fit: "Growth-value", note: "Infrastructure and industrial-side development." },
      { name: "Jhunsi", fit: "Residential expansion", note: "Affordable growth with access checks." },
      { name: "Bamrauli", fit: "Airport-side", note: "Long-horizon potential and variable maturity." },
    ],
    rera: { name: "UP RERA", url: "https://www.up-rera.in/" }, searchTerms: ["Prayagraj property", "Allahabad real estate"]
  }),
  makeCityProfile({
    slug: "agra", city: "Agra", state: "Uttar Pradesh", region: "Uttar Pradesh", score: 70, recommendation: "Watchlist",
    tagline: "Tourism and regional commerce support a value-led but locally driven market.",
    summary: "Agra has strong tourism recognition and improving road connectivity, yet residential investment remains primarily end-user led. NRIs should avoid assuming tourism automatically translates into strong residential yields.",
    nriFit: "Suitable for family use, local business or selective hospitality-linked strategies.",
    growth: "Medium", rental: "Low–Medium", liquidity: "Medium", riskLabel: "Demand risk", riskNote: "Tourism does not guarantee residential yield",
    drivers: ["Tourism", "Yamuna Expressway", "Regional trade", "Education and healthcare", "Local end-user demand"],
    risks: ["Low rental depth", "Localised pricing", "Peripheral plotted schemes", "Environmental and zoning constraints"],
    corridors: [
      { name: "Fatehabad Road", fit: "Tourism-premium", note: "Hospitality and residential mix." },
      { name: "Sikandra", fit: "Established growth", note: "Residential and commercial demand." },
      { name: "Shastripuram", fit: "Value", note: "Planned residential stock with varied maturity." },
      { name: "Dayal Bagh", fit: "Family use", note: "Education and established end-user demand." },
    ],
    rera: { name: "UP RERA", url: "https://www.up-rera.in/" }, searchTerms: ["Agra property", "Agra real estate"]
  }),
  makeCityProfile({
    slug: "meerut", city: "Meerut", state: "Uttar Pradesh", region: "Uttar Pradesh", score: 78, recommendation: "Selective opportunity",
    tagline: "RRTS connectivity is strengthening Meerut’s position within the wider NCR economy.",
    summary: "Meerut combines a large local economy with improving Delhi connectivity. The strongest NRI case is in established or transit-linked locations with clear end-user demand.",
    nriFit: "Good for value-led NCR exposure and buyers with western UP connections.",
    growth: "High", rental: "Medium", liquidity: "Medium–High", riskLabel: "Speculation risk", riskNote: "Avoid pricing based only on future transit",
    drivers: ["Delhi–Meerut RRTS", "Expressway connectivity", "Sports and manufacturing economy", "Education", "Large end-user base"],
    risks: ["Speculative corridor pricing", "Peripheral approvals", "Uneven rental depth", "Local developer variation"],
    corridors: [
      { name: "Pallavpuram", fit: "Transit-growth", note: "Delhi-side connectivity and established housing." },
      { name: "Modipuram", fit: "Growth", note: "RRTS and highway-led expansion." },
      { name: "Shastri Nagar", fit: "Established", note: "Deep local end-user demand." },
      { name: "Delhi Road", fit: "Connectivity", note: "Commercial and residential mixed corridor." },
    ],
    rera: { name: "UP RERA", url: "https://www.up-rera.in/" }, searchTerms: ["Meerut property", "RRTS Meerut real estate"]
  }),
  makeCityProfile({
    slug: "haridwar", city: "Haridwar", state: "Uttarakhand", region: "Uttarakhand", score: 71, recommendation: "Lifestyle-led",
    tagline: "Pilgrimage, industry and retirement demand with seasonal and regulatory complexity.",
    summary: "Haridwar serves pilgrimage, industrial employment and retirement demand. The investment case differs sharply between residential, ashram-adjacent, industrial and holiday-use locations.",
    nriFit: "Best for spiritual, retirement or family-use buyers with reliable local management.",
    growth: "Medium", rental: "Low–Medium", liquidity: "Medium", riskLabel: "Flood risk", riskNote: "Drainage, river proximity and land use need review",
    drivers: ["Pilgrimage", "SIDCUL employment", "Delhi connectivity", "Retirement demand", "Healthcare and services"],
    risks: ["Flood and drainage", "Seasonal demand", "Land-use restrictions", "Second-home vacancy"],
    corridors: [
      { name: "SIDCUL", fit: "Employment-rental", note: "Industrial workforce and apartment demand." },
      { name: "Jwalapur", fit: "Established", note: "Local residential and commercial depth." },
      { name: "BHEL", fit: "Stable end-user", note: "Established institutional housing catchment." },
      { name: "Delhi Road", fit: "Growth", note: "Connectivity-led development with approval checks." },
    ],
    rera: { name: "Uttarakhand RERA", url: "https://uhuda.uk.gov.in/pages/display/92-real-estate-regulatory-authority" }, searchTerms: ["Haridwar property", "Haridwar real estate"]
  }),
  makeCityProfile({
    slug: "rishikesh", city: "Rishikesh", state: "Uttarakhand", region: "Uttarakhand", score: 74, recommendation: "Lifestyle-led",
    tagline: "A wellness and tourism market where regulation and management determine outcomes.",
    summary: "Rishikesh has global wellness and tourism appeal, but residential, hospitality and holiday-home strategies carry different legal and operating requirements. Scenic marketing should never replace land-use and access diligence.",
    nriFit: "Best for managed second homes, wellness-linked use or long-term lifestyle ownership.",
    growth: "Medium–High", rental: "Seasonal", liquidity: "Medium", riskLabel: "Regulatory risk", riskNote: "Land use, river zone and short-stay rules matter",
    drivers: ["Yoga and wellness tourism", "Pilgrimage", "Delhi connectivity", "Hospitality demand", "Lifestyle migration"],
    risks: ["Seasonality", "Flood and slope risk", "Land-use restrictions", "Remote management"],
    corridors: [
      { name: "Tapovan", fit: "Tourism-rental", note: "Strong visitor demand with operational complexity." },
      { name: "Shyampur", fit: "Residential growth", note: "More conventional housing and access." },
      { name: "Virbhadra", fit: "Local end-user", note: "Healthcare and established demand." },
      { name: "Narendra Nagar road", fit: "Lifestyle", note: "Scenic premium with terrain and access risk." },
    ],
    rera: { name: "Uttarakhand RERA", url: "https://uhuda.uk.gov.in/pages/display/92-real-estate-regulatory-authority" }, searchTerms: ["Rishikesh property", "Rishikesh second home"]
  }),
  makeCityProfile({
    slug: "haldwani", city: "Haldwani", state: "Uttarakhand", region: "Uttarakhand", score: 68, recommendation: "Watchlist",
    tagline: "A regional commercial gateway with end-user demand and limited organised data.",
    summary: "Haldwani is the commercial gateway to Kumaon, supported by healthcare, education and trade. Its property market is highly local, so NRIs need disciplined title, road-access and flood-risk checks.",
    nriFit: "Suitable for family use or locally supported long-term ownership.",
    growth: "Medium", rental: "Medium", liquidity: "Low–Medium", riskLabel: "Land risk", riskNote: "Title, access and drainage require care",
    drivers: ["Regional trade", "Healthcare", "Education", "Gateway to Kumaon", "Local end-user growth"],
    risks: ["Flood and drainage", "Fragmented land titles", "Limited organised projects", "Lower resale transparency"],
    corridors: [
      { name: "Nainital Road", fit: "Established", note: "Commercial and residential demand." },
      { name: "Kathgodam", fit: "Connectivity", note: "Rail and hill-access influence." },
      { name: "Rampur Road", fit: "Value-growth", note: "Industrial and residential expansion." },
      { name: "Kaladhungi Road", fit: "Residential", note: "Newer housing with infrastructure checks." },
    ],
    rera: { name: "Uttarakhand RERA", url: "https://uhuda.uk.gov.in/pages/display/92-real-estate-regulatory-authority" }, searchTerms: ["Haldwani property", "Haldwani real estate"]
  }),
  makeCityProfile({
    slug: "rudrapur", city: "Rudrapur", state: "Uttarakhand", region: "Uttarakhand", score: 70, recommendation: "Watchlist",
    tagline: "Industrial employment supports housing demand in a value-led regional market.",
    summary: "Rudrapur benefits from industrial employment and comparatively affordable housing. NRI buyers should focus on actual workforce rental demand, drainage, builder quality and exit liquidity.",
    nriFit: "Suitable for value-led buyers with local industrial or family connections.",
    growth: "Medium", rental: "Medium", liquidity: "Low–Medium", riskLabel: "Flood risk", riskNote: "Drainage and monsoon resilience matter",
    drivers: ["SIDCUL industry", "Pantnagar connectivity", "Affordable housing", "Regional commerce", "Workforce demand"],
    risks: ["Flood and drainage", "Lower premium liquidity", "Industrial-cycle sensitivity", "Developer variation"],
    corridors: [
      { name: "Kashipur Road", fit: "Industrial-rental", note: "Employment access and apartment demand." },
      { name: "Metropolis area", fit: "Organised housing", note: "Modern community format and retail access." },
      { name: "Pantnagar Road", fit: "Growth", note: "Airport and industry influence." },
      { name: "City centre", fit: "Established", note: "Local services and liquidity." },
    ],
    rera: { name: "Uttarakhand RERA", url: "https://uhuda.uk.gov.in/pages/display/92-real-estate-regulatory-authority" }, searchTerms: ["Rudrapur property", "Pantnagar real estate"]
  }),
  makeCityProfile({
    slug: "udaipur", city: "Udaipur", state: "Rajasthan", region: "Rajasthan", score: 76, recommendation: "Lifestyle-led",
    tagline: "Tourism, hospitality and lifestyle demand with a selective residential market.",
    summary: "Udaipur attracts second-home, hospitality and family buyers, but the residential rental market is narrower than Jaipur. Views, access, water and operating permissions require careful review.",
    nriFit: "Best for lifestyle, family use or professionally managed hospitality-linked assets.",
    growth: "Medium–High", rental: "Seasonal", liquidity: "Medium", riskLabel: "Operating risk", riskNote: "Hospitality and short-stay assumptions need verification",
    drivers: ["Tourism", "Hospitality", "Destination weddings", "Education and services", "Lifestyle demand"],
    risks: ["Seasonal income", "Water and access", "Peripheral land approvals", "High maintenance"],
    corridors: [
      { name: "Fatehpura", fit: "Established premium", note: "Strong amenities and local demand." },
      { name: "Bhopalpura", fit: "Central residential", note: "Established housing and services." },
      { name: "Airport Road", fit: "Growth", note: "Connectivity-led expansion." },
      { name: "Nathdwara Road", fit: "Long-horizon", note: "Tourism and regional connectivity with land-risk checks." },
    ],
    rera: { name: "Rajasthan RERA", url: "https://rera.rajasthan.gov.in/" }, searchTerms: ["Udaipur property", "Udaipur real estate", "Udaipur second home"]
  }),
  makeCityProfile({
    slug: "jodhpur", city: "Jodhpur", state: "Rajasthan", region: "Rajasthan", score: 69, recommendation: "Watchlist",
    tagline: "A stable regional city led by local end users, defence and tourism.",
    summary: "Jodhpur has diversified local demand but limited institutional residential depth. NRI buyers should focus on established neighbourhoods and realistic resale expectations.",
    nriFit: "Suitable for family use, local business or patient long-term ownership.",
    growth: "Medium", rental: "Low–Medium", liquidity: "Medium", riskLabel: "Market-depth risk", riskNote: "Premium resale can be slow",
    drivers: ["Defence", "Tourism", "Regional commerce", "Education and healthcare", "Local family demand"],
    risks: ["Lower rental depth", "Limited organised supply", "Water constraints", "Peripheral plotting risk"],
    corridors: [
      { name: "Sardarpura", fit: "Established premium", note: "Central amenities and strong recognition." },
      { name: "Pal Road", fit: "Residential growth", note: "Newer housing and family demand." },
      { name: "Shikargarh", fit: "Airport-side", note: "Lifestyle and connectivity influence." },
      { name: "Banar Road", fit: "Value", note: "Expansion corridor with infrastructure checks." },
    ],
    rera: { name: "Rajasthan RERA", url: "https://rera.rajasthan.gov.in/" }, searchTerms: ["Jodhpur property", "Jodhpur real estate"]
  }),
  makeCityProfile({
    slug: "ajmer", city: "Ajmer", state: "Rajasthan", region: "Rajasthan", score: 66, recommendation: "Watchlist",
    tagline: "Pilgrimage, education and local demand in a lower-liquidity regional market.",
    summary: "Ajmer has stable pilgrimage, education and local housing demand, but limited institutional investment depth. NRI purchases should have a clear family, end-user or operational purpose.",
    nriFit: "Best for family use, spiritual links or locally managed long-term ownership.",
    growth: "Low–Medium", rental: "Low–Medium", liquidity: "Low–Medium", riskLabel: "Liquidity risk", riskNote: "Exit periods can be long",
    drivers: ["Pilgrimage", "Education", "Regional administration", "Tourism", "Local end-user demand"],
    risks: ["Lower liquidity", "Fragmented pricing", "Limited organised projects", "Peripheral land approvals"],
    corridors: [
      { name: "Vaishali Nagar", fit: "Established", note: "Preferred residential amenities." },
      { name: "Panchsheel", fit: "Family use", note: "Planned housing and local demand." },
      { name: "Pushkar Road", fit: "Lifestyle-tourism", note: "Special-use potential with operating risk." },
      { name: "Jaipur Road", fit: "Growth", note: "Connectivity-led expansion with approval checks." },
    ],
    rera: { name: "Rajasthan RERA", url: "https://rera.rajasthan.gov.in/" }, searchTerms: ["Ajmer property", "Pushkar real estate"]
  }),

]

export const cityBySlug = Object.fromEntries(cityProfiles.map((city) => [city.slug, city])) as Record<string, CityProfile>
