"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { useDios } from "@/components/dios/store";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StakeTrade = {
  messageId: string;
  threadId: string | null;
  subject: string;
  emailDate: string;
  ticker: string | null;
  side: "Buy" | "Sell" | null;
  quantity: number | null;
  price: number | null;
  currency: string;
  brokerageFee: number;
  fxFee: number;
  tradeDate: string;
  orderType: string | null;
  status: "Ready" | "Needs Review";
  fingerprint: string;
  preview: string;
  issues: string[];
};

type ApiResponse = {
  connected: boolean;
  scannedAt?: string;
  count?: number;
  ready?: number;
  needsReview?: number;
  trades: StakeTrade[];
  error?: string;
};

function isAlreadyImported(
  trade: StakeTrade,
  transactionNotes: string[],
): boolean {
  return transactionNotes.some(
    (notes) =>
      notes.includes(`[Stake:${trade.messageId}]`) ||
      notes.includes(`[FP:${trade.fingerprint}]`),
  );
}

export default function StakeSyncClient() {
  const { transactions, addTransactions } = useDios();
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const transactionNotes = useMemo(
    () => transactions.map((item) => item.notes ?? ""),
    [transactions],
  );

  const decorated = useMemo(
    () =>
      (result?.trades ?? []).map((trade) => ({
        ...trade,
        duplicate: isAlreadyImported(trade, transactionNotes),
      })),
    [result?.trades, transactionNotes],
  );

  const importable = useMemo(
    () =>
      decorated.filter(
        (trade) =>
          trade.status === "Ready" &&
          !trade.duplicate &&
          trade.ticker &&
          trade.side &&
          trade.quantity &&
          trade.price,
      ),
    [decorated],
  );

  async function scan() {
    setLoading(true);
    setSelected(new Set());

    try {
      const response = await fetch("/api/stake/trades", {
        cache: "no-store",
      });

      const data = (await response.json()) as ApiResponse;
      setResult(data);

      if (data.connected) {
        const readyIds = new Set(
          data.trades
            .filter((trade) => trade.status === "Ready")
            .map((trade) => trade.messageId),
        );
        setSelected(readyIds);
      }
    } catch {
      setResult({
        connected: false,
        trades: [],
        error: "Unable to contact the DIOS Stake sync service.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void scan();
  }, []);

  useEffect(() => {
    if (!result) return;
    setSelected(
      new Set(
        decorated
          .filter((trade) => trade.status === "Ready" && !trade.duplicate)
          .map((trade) => trade.messageId),
      ),
    );
  }, [decorated, result]);

  function importSelected() {
    const chosen = importable.filter((trade) => selected.has(trade.messageId));

    if (chosen.length === 0) {
      toast.error("No new ready trades selected");
      return;
    }

    const count = addTransactions(
      chosen.map((trade) => ({
        date: trade.tradeDate,
        ticker: trade.ticker!,
        type: trade.side!,
        quantity: trade.quantity!,
        price: trade.price!,
        currency: trade.currency || "USD",
        brokerageFee: trade.brokerageFee ?? 0,
        fxFee: trade.fxFee ?? 0,
        notes: `Stake Gmail import ${trade.orderType ?? ""} [Stake:${trade.messageId}] [FP:${trade.fingerprint}]`.trim(),
      })),
    );

    setSelected(new Set());
    toast.success(
      `Imported ${count} Stake transaction${count === 1 ? "" : "s"}. Portfolio and dashboard updated.`,
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Scanning Stake confirmations…</p>;
  }

  if (!result?.connected) {
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Connect Stake Gmail</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          DIOS requests read-only Gmail access and searches for messages from
          notifications@hellostake.com.
        </p>
        {result?.error ? (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {result.error}
          </p>
        ) : null}
        <Button className="mt-4" render={<a href="/api/auth/google" />}>
          Connect Gmail
        </Button>
      </section>
    );
  }

  const selectedCount = importable.filter((trade) =>
    selected.has(trade.messageId),
  ).length;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-positive" />
              <h2 className="font-semibold">Gmail connected</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.count ?? 0} confirmations scanned · {importable.length} new
              ready · {result.needsReview ?? 0} need review
              {result.scannedAt
                ? ` · ${new Date(result.scannedAt).toLocaleString()}`
                : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void scan()}>
              <RefreshCw className="h-4 w-4" />
              Scan now
            </Button>
            <Button onClick={importSelected} disabled={selectedCount === 0}>
              <Download className="h-4 w-4" />
              Import selected ({selectedCount})
            </Button>
            <form action="/api/auth/google/disconnect" method="post">
              <Button type="submit" variant="outline">
                Disconnect
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <strong>Review-first safety:</strong> importing historical confirmations
          on top of manually entered holdings can duplicate your portfolio. Select
          only trades that are not already reflected in DIOS.
        </div>

        {result.error ? (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {result.error}
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold">Detected Stake trades</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ready trades can be imported. Incomplete confirmations remain
            unselected and must be reviewed.
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Import</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-[18rem]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decorated.map((trade) => {
                const canImport =
                  trade.status === "Ready" && !trade.duplicate;

                return (
                  <TableRow key={trade.messageId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(trade.messageId)}
                        disabled={!canImport}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelected((current) => {
                            const next = new Set(current);
                            if (checked) next.add(trade.messageId);
                            else next.delete(trade.messageId);
                            return next;
                          });
                        }}
                        aria-label={`Select ${trade.ticker ?? "trade"}`}
                        className="h-4 w-4 cursor-pointer rounded border-border accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {trade.tradeDate}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {trade.ticker ?? "—"}
                    </TableCell>
                    <TableCell>{trade.side ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {trade.quantity ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {trade.price ? `$${trade.price.toFixed(4)}` : "—"}
                    </TableCell>
                    <TableCell>
                      {trade.duplicate ? (
                        <span className="rounded bg-muted px-2 py-1 text-xs">
                          Imported
                        </span>
                      ) : trade.status === "Ready" ? (
                        <span className="rounded bg-positive/10 px-2 py-1 text-xs text-positive">
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-2 py-1 text-xs text-warning-foreground">
                          <AlertTriangle className="h-3 w-3" />
                          Needs review
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {trade.issues.length > 0
                        ? trade.issues.join(" · ")
                        : `${trade.orderType ?? "Filled order"} · ${trade.subject}`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
