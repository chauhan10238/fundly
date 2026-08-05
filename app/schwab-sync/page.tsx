import SchwabSyncClient from "./SchwabSyncClient"

export const dynamic = "force-dynamic"

export default function SchwabSyncPage() {
  return <div className="mx-auto max-w-7xl space-y-6">
    <header>
      <p className="text-sm text-muted-foreground">Fundly Broker Inbox</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Schwab Sync</h1>
      <p className="mt-1 text-sm text-muted-foreground">Scan Charles Schwab Gmail notifications, review generic parser results and import confirmed buys or sells into Suren's profile. Messages that do not contain enough trade details are marked Needs Review.</p>
    </header>
    <SchwabSyncClient />
  </div>
}
