import type { Transaction, TransactionType } from "./types"

export interface ParsedRow {
  transaction: Omit<Transaction, "id">
  raw: Record<string, string>
}

export interface ParseResult {
  rows: ParsedRow[]
  errors: string[]
  detectedFormat: string
}

// Minimal CSV line splitter that respects double-quoted fields.
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

// Map many broker column names to canonical fields.
const FIELD_ALIASES: Record<string, string[]> = {
  date: ["date", "tradedate", "transactiondate", "settledate", "time", "createdat"],
  type: ["type", "transactiontype", "side", "action", "activity", "ordertype"],
  ticker: ["ticker", "symbol", "instrument", "code", "security", "asx", "stock"],
  quantity: ["quantity", "qty", "units", "shares", "volume", "amount"],
  price: ["price", "unitprice", "priceusd", "executedprice", "avgprice", "fillprice"],
  brokerageFee: ["brokerage", "brokeragefee", "commission", "fee", "fees"],
  fxFee: ["fxfee", "fx", "fxcharge", "currencyconversion", "fxbrokerage"],
  currency: ["currency", "ccy", "curr"],
}

function mapType(raw: string): TransactionType | null {
  const t = norm(raw)
  if (["buy", "b", "bought", "purchase", "marketbuy", "limitbuy"].includes(t)) return "Buy"
  if (["sell", "s", "sold", "sale", "marketsell", "limitsell"].includes(t)) return "Sell"
  if (["dividend", "div", "distribution", "drp"].includes(t)) return "Dividend"
  if (["deposit", "topup", "funding", "cashin", "transferin"].includes(t)) return "Deposit"
  if (["withdrawal", "withdraw", "cashout", "transferout"].includes(t)) return "Withdrawal"
  if (["fee", "charge", "adjustment", "interest"].includes(t)) return "Fee"
  return null
}

export function parseTransactionsCsv(text: string): ParseResult {
  const errors: string[] = []
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) {
    return { rows: [], errors: ["File appears empty or has no data rows."], detectedFormat: "unknown" }
  }

  const header = splitCsvLine(lines[0])
  const headerNorm = header.map(norm)

  // Build column index for each canonical field.
  const colIndex: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const idx = headerNorm.findIndex((h) => aliases.includes(h))
    if (idx !== -1) colIndex[field] = idx
  }

  const looksLikeStake = headerNorm.some((h) => h.includes("brokerage")) && colIndex.ticker !== undefined
  const detectedFormat = looksLikeStake ? "Stake-style CSV" : "Generic broker CSV"

  if (colIndex.ticker === undefined || colIndex.type === undefined) {
    errors.push(
      "Could not detect required columns. Expected at least a type/side column and a ticker/symbol column.",
    )
    return { rows: [], errors, detectedFormat }
  }

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const get = (field: string) => (colIndex[field] !== undefined ? cells[colIndex[field]] ?? "" : "")
    const rawType = get("type")
    const type = mapType(rawType)
    const ticker = get("ticker").toUpperCase().replace(/\.AX$/, "")

    if (!type) {
      errors.push(`Row ${i + 1}: unrecognised transaction type "${rawType}" — skipped.`)
      continue
    }
    if (!ticker && type !== "Deposit" && type !== "Withdrawal" && type !== "Fee") {
      errors.push(`Row ${i + 1}: missing ticker — skipped.`)
      continue
    }

    const quantity = Number(get("quantity").replace(/[^0-9.-]/g, "")) || 0
    const price = Number(get("price").replace(/[^0-9.-]/g, "")) || 0
    const brokerageFee = Number(get("brokerageFee").replace(/[^0-9.-]/g, "")) || 0
    const fxFee = Number(get("fxFee").replace(/[^0-9.-]/g, "")) || 0
    const currency = get("currency").toUpperCase() || "USD"
    const rawDate = get("date")
    const date = normaliseDate(rawDate)

    const rawObj: Record<string, string> = {}
    header.forEach((h, idx) => (rawObj[h] = cells[idx] ?? ""))

    rows.push({
      transaction: {
        date,
        ticker: ticker || "CASH",
        type,
        quantity,
        price,
        currency,
        brokerageFee,
        fxFee,
        notes: "Imported from CSV",
      },
      raw: rawObj,
    })
  }

  return { rows, errors, detectedFormat }
}

function normaliseDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10)
  // Try ISO first
  const iso = raw.match(/^\d{4}-\d{2}-\d{2}/)
  if (iso) return iso[0]
  // dd/mm/yyyy or mm/dd/yyyy
  const parts = raw.split(/[/\-.]/).map((p) => p.trim())
  if (parts.length === 3) {
    let [a, b, c] = parts
    if (c.length === 2) c = `20${c}`
    // assume dd/mm/yyyy (common for AU brokers like Stake)
    const day = a.padStart(2, "0")
    const month = b.padStart(2, "0")
    if (Number(month) <= 12) return `${c}-${month}-${day}`
  }
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

// Sample CSV so the user can try the import without a file.
export const SAMPLE_STAKE_CSV = `Date,Type,Symbol,Units,Price (USD),Brokerage,FX Fee,Currency
2025-11-04,Buy,NVDA,15,132.40,3.00,1.20,USD
2025-12-01,Buy,GLD,20,214.10,3.00,1.80,USD
2026-01-15,Sell,AMD,10,168.50,3.00,0.90,USD
2026-01-22,Dividend,SCHD,120,0.74,0.00,0.00,USD
2026-02-01,Deposit,,1000,1.00,0.00,0.00,USD`
