"use client"

import { useMemo, useRef, useState } from "react"
import { Trash2, Upload, Plus, FileText } from "lucide-react"
import { toast } from "sonner"
import { useDios } from "@/components/dios/store"
import { fmtCurrency, fmtDate } from "@/lib/format"
import { Panel, StatCard } from "@/components/dios/ui-bits"
import { parseTransactionsCsv, SAMPLE_STAKE_CSV, type ParsedRow } from "@/lib/dios/csv-import"
import { getInstrument, UNIVERSE_LIST } from "@/lib/dios/universe"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { TransactionType } from "@/lib/dios/types"

const TYPE_COLORS: Record<string, string> = {
  Buy: "text-positive",
  Sell: "text-negative",
  Dividend: "text-primary",
  Deposit: "text-positive",
  Withdrawal: "text-negative",
  Fee: "text-muted-foreground",
}

export default function TransactionsPage() {
  const { transactions, addTransaction, removeTransaction, addTransactions } = useDios()

  const totals = useMemo(() => {
    let invested = 0
    let dividends = 0
    let fees = 0
    for (const t of transactions) {
      if (t.type === "Buy") invested += t.price * t.quantity
      if (t.type === "Dividend") dividends += t.price * t.quantity
      fees += (t.brokerageFee ?? 0) + (t.fxFee ?? 0)
    }
    return { invested, dividends, fees }
  }, [transactions])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full ledger with weighted-average cost. Import a broker CSV (Stake-style supported) or add entries manually.
          </p>
        </div>
        <div className="flex gap-2">
          <ImportCsvDialog onImport={addTransactions} />
          <AddTransactionDialog onAdd={addTransaction} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entries" value={transactions.length} />
        <StatCard label="Total Invested" value={fmtCurrency(totals.invested, "USD", 0)} />
        <StatCard label="Dividends" value={fmtCurrency(totals.dividends, "USD", 0)} accent="positive" />
        <StatCard label="Fees Paid" value={fmtCurrency(totals.fees, "USD", 0)} accent="negative" />
      </div>

      <Panel title="Ledger" description="Newest first. Buys and sells recompute holdings automatically.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="hidden lg:table-cell">Notes</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const value = t.price * t.quantity
                return (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-sm">{fmtDate(t.date)}</TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${TYPE_COLORS[t.type] ?? ""}`}>{t.type}</span>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{t.ticker}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.quantity || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.price ? fmtCurrency(t.price) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmtCurrency((t.brokerageFee ?? 0) + (t.fxFee ?? 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(value, "USD", 0)}</TableCell>
                    <TableCell className="hidden max-w-[14rem] truncate text-xs text-muted-foreground lg:table-cell">
                      {t.notes}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          removeTransaction(t.id)
                          toast.success("Transaction removed")
                        }}
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  )
}

function AddTransactionDialog({ onAdd }: { onAdd: (t: Omit<import("@/lib/dios/types").Transaction, "id">) => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>("Buy")
  const [ticker, setTicker] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [fee, setFee] = useState("")

  function submit() {
    const needsTicker = type === "Buy" || type === "Sell" || type === "Dividend"
    const t = ticker.trim().toUpperCase()
    if (needsTicker && !getInstrument(t)) {
      toast.error(`${t || "Ticker"} is not in the demo universe`)
      return
    }
    onAdd({
      date,
      ticker: needsTicker ? t : "CASH",
      type,
      quantity: Number(quantity) || 0,
      price: Number(price) || (type === "Deposit" || type === "Withdrawal" ? 1 : 0),
      currency: "USD",
      brokerageFee: Number(fee) || 0,
      fxFee: 0,
      notes: "Manual entry",
    })
    toast.success(`${type} recorded`)
    setOpen(false)
    setTicker("")
    setQuantity("")
    setPrice("")
    setFee("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a transaction</DialogTitle>
          <DialogDescription>Buys and sells adjust holdings and cash automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Buy", "Sell", "Dividend", "Deposit", "Withdrawal", "Fee"] as TransactionType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-ticker">Ticker</Label>
            <Input
              id="tx-ticker"
              list="tx-universe"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="e.g. NVDA"
              className="font-mono"
              disabled={type === "Deposit" || type === "Withdrawal" || type === "Fee"}
            />
            <datalist id="tx-universe">
              {UNIVERSE_LIST.map((i) => (
                <option key={i.ticker} value={i.ticker}>
                  {i.name}
                </option>
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-qty">Qty</Label>
              <Input id="tx-qty" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-price">Price</Label>
              <Input id="tx-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-fee">Fees</Label>
              <Input id="tx-fee" type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportCsvDialog({ onImport }: { onImport: (t: Omit<import("@/lib/dios/types").Transaction, "id">[]) => number }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [format, setFormat] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  function handleText(text: string) {
    const result = parseTransactionsCsv(text)
    setRows(result.rows)
    setErrors(result.errors)
    setFormat(result.detectedFormat)
  }

  async function handleFile(file: File) {
    const text = await file.text()
    handleText(text)
  }

  function commit() {
    if (rows.length === 0) {
      toast.error("Nothing to import")
      return
    }
    const n = onImport(rows.map((r) => r.transaction))
    toast.success(`Imported ${n} transactions`)
    setOpen(false)
    setRows([])
    setErrors([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import transactions from CSV</DialogTitle>
          <DialogDescription>
            Column names are auto-detected across common broker exports (Stake, generic). Review before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <FileText className="h-4 w-4" />
              Choose CSV file
            </Button>
            <Button variant="ghost" onClick={() => handleText(SAMPLE_STAKE_CSV)}>
              Load sample data
            </Button>
          </div>

          {format && (
            <div className="rounded-md border border-border bg-muted/40 p-2.5 text-sm">
              Detected format: <span className="font-medium">{format}</span> · {rows.length} valid rows
            </div>
          )}

          {errors.length > 0 && (
            <ul className="space-y-1 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning-foreground">
              {errors.slice(0, 6).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}

          {rows.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Ticker</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{r.transaction.date}</TableCell>
                      <TableCell className="text-sm">{r.transaction.type}</TableCell>
                      <TableCell className="font-mono text-sm">{r.transaction.ticker}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.transaction.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.transaction.price}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={commit} disabled={rows.length === 0}>
            Import {rows.length > 0 ? `${rows.length} rows` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
