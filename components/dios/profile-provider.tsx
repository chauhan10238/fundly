"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type Profile = {
  id: "deepak" | "suren"
  name: string
  role: "admin" | "investor"
  pinRequired: boolean
}

type ProfileContextValue = {
  profiles: Profile[]
  activeProfile: Profile | null
  ready: boolean
  switchProfile: (profileId: string, pin?: string) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/profiles", { cache: "no-store" })
      const payload = await response.json() as { profiles?: Profile[]; activeProfileId?: string | null }
      setProfiles(Array.isArray(payload.profiles) ? payload.profiles : [])
      setActiveProfileId(payload.activeProfileId ?? null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const switchProfile = useCallback(async (profileId: string, pin = "") => {
    const response = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, pin }),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null
    if (!response.ok) throw new Error(payload?.error || "Unable to open this profile")
    window.location.reload()
  }, [])

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  )

  return (
    <ProfileContext.Provider value={{ profiles, activeProfile, ready, switchProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) throw new Error("useProfile must be used within ProfileProvider")
  return context
}
