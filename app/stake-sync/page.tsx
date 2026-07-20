import StakeSyncClient from "./StakeSyncClient";

export const dynamic = "force-dynamic";

export default function StakeSyncPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">DIOS Broker Inbox</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Stake Sync
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan filled Stake orders, review parsed transactions and import them
          into DIOS. Imported trades update Transactions, Holdings and the
          Dashboard immediately.
        </p>
      </header>

      <StakeSyncClient />
    </div>
  );
}
