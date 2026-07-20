import StakeSyncClient from "./StakeSyncClient";

export const dynamic = "force-dynamic";

export default function StakeSyncPage() {
  return (
    <main
      style={{
        width: "min(100% - 32px, 1000px)",
        margin: "40px auto",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <p style={{ marginBottom: 8 }}>DIOS Broker Inbox</p>
        <h1 style={{ margin: 0 }}>Stake Gmail Sync</h1>
        <p>
          Phase 1 is read-only. It finds Stake emails but does not add or change
          portfolio transactions.
        </p>
      </header>

      <StakeSyncClient />
    </main>
  );
}
