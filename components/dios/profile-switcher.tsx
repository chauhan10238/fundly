"use client"

import { useEffect, useState } from "react"
import { LockKeyhole, UserRound, X } from "lucide-react"
import { toast } from "sonner"
import { useProfile } from "@/components/dios/profile-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ProfileSwitcher() {
  const { profiles, activeProfile, switchProfile } = useProfile()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [pin, setPin] = useState("")
  const [busy, setBusy] = useState(false)

  const target = profiles.find((profile) => profile.id === selected)
  const locked = !activeProfile

  useEffect(() => {
    if (locked && profiles.length > 0) setOpen(true)
  }, [locked, profiles.length])

  async function openProfile(profileId: string) {
    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) return
    if (profile.pinRequired) {
      setSelected(profileId)
      setPin("")
      return
    }
    setBusy(true)
    try { await switchProfile(profileId) }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to switch profile") }
    finally { setBusy(false) }
  }

  async function unlock() {
    if (!target) return
    setBusy(true)
    try { await switchProfile(target.id, pin) }
    catch (error) { toast.error(error instanceof Error ? error.message : "Incorrect PIN") }
    finally { setBusy(false) }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
        title="Switch Fundly profile"
      >
        <UserRound className="h-3.5 w-3.5" />
        <span className="font-medium">{activeProfile?.name || "Profile"}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{locked ? "Unlock Fundly" : "Choose profile"}</h2>
                <p className="text-sm text-muted-foreground">Each profile has separate holdings and transactions.</p>
              </div>
              {!locked ? (
                <button onClick={() => { setOpen(false); setSelected(null) }} className="rounded p-1 hover:bg-muted" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {!target ? (
              <div className="mt-4 space-y-2">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => void openProfile(profile.id)}
                    disabled={busy}
                    className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted disabled:opacity-50"
                  >
                    <span>
                      <span className="block font-medium">{profile.name}</span>
                      <span className="text-xs capitalize text-muted-foreground">{profile.role} profile</span>
                    </span>
                    {profile.pinRequired ? <LockKeyhole className="h-4 w-4 text-muted-foreground" /> : null}
                  </button>
                ))}
              </div>
            ) : (
              <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void unlock() }}>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="font-medium">{target.name}</div>
                  <div className="text-xs text-muted-foreground">Enter the profile PIN to continue.</div>
                </div>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                  placeholder="PIN"
                  className="text-center font-mono text-lg tracking-[0.35em]"
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setSelected(null)}>Back</Button>
                  <Button type="submit" className="flex-1" disabled={busy || pin.length < 4}>{busy ? "Opening…" : "Open profile"}</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
