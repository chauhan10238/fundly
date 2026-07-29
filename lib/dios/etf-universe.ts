/**
 * DIOS v3 Week 1 ETF discovery universe.
 *
 * This list is intentionally provider-agnostic. It is shared by Daily Scan and
 * Daily Brief so the two surfaces cannot silently scan different instruments.
 * Symbols are grouped for maintainability, deduplicated at export time, and can
 * later be enriched by the Week 2 ETF knowledge base.
 */
const CORE = [
  "VOO", "SPY", "IVV", "VTI", "VT", "QQQ", "QQQM", "DIA", "IWM", "IJR",
  "SCHD", "VIG", "DGRO", "VYM", "VUG", "VTV", "QUAL", "USMV", "MTUM", "AVUV",
]

const US_SECTORS = [
  "XLK", "VGT", "FTEC", "SMH", "SOXX", "SOXQ", "XLE", "VDE", "XLF", "VFH",
  "XLV", "VHT", "XLI", "VIS", "XLP", "VDC", "XLU", "VPU", "XLY", "XLC",
  "VNQ", "IYR", "XLB", "IYT", "ITA", "PAVE", "XHB", "KRE", "KBE", "IHI",
]

const THEMATIC = [
  "CIBR", "HACK", "BOTZ", "ROBO", "ARKQ", "ARKK", "AIQ", "IGV", "SKYY", "CLOU",
  "FINX", "IPAY", "IBB", "XBI", "ARKG", "ICLN", "TAN", "QCLN", "LIT", "DRIV",
  "URA", "URNM", "COPX", "GDX", "GDXJ", "SIL", "KWEB", "MCHI", "INDA", "EPI",
]

const INTERNATIONAL = [
  "VEA", "IEFA", "EFA", "VXUS", "VWO", "IEMG", "EEM", "EWJ", "VGK", "EWG",
  "EWU", "EWQ", "EWL", "EWA", "EWC", "EWT", "EWY", "EWS", "EZA", "FM",
]

const FIXED_INCOME = [
  "BND", "AGG", "BNDX", "TLT", "IEF", "SHY", "VGSH", "VGIT", "VGLT", "TIP",
  "SCHP", "LQD", "HYG", "JNK", "VCIT", "VCSH", "MUB", "BIL", "SGOV", "JPST",
]

const REAL_ASSETS = [
  "GLD", "IAU", "SLV", "PPLT", "DBC", "PDBC", "USO", "UNG", "DBA", "COMT",
  "IBIT", "FBTC", "BITB", "ARKB", "ETHA",
]

export const ETF_DISCOVERY_UNIVERSE = Array.from(
  new Set([
    ...CORE,
    ...US_SECTORS,
    ...THEMATIC,
    ...INTERNATIONAL,
    ...FIXED_INCOME,
    ...REAL_ASSETS,
  ]),
)

/** A smaller list suitable for a single Vercel request before batch APIs land. */
export const ETF_DAILY_BRIEF_UNIVERSE = ETF_DISCOVERY_UNIVERSE.slice(0, 48)
