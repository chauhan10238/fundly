import type { DiosProfile } from "@/lib/dios/profile-auth"

export type BrokerId = "stake" | "schwab"

export function brokerForProfile(profileId: DiosProfile["id"]): BrokerId {
  return profileId === "suren" ? "schwab" : "stake"
}

export function brokerCookieNames(profileId: DiosProfile["id"], broker: BrokerId) {
  const suffix = `${profileId}_${broker}`
  return {
    refreshToken: `dios_google_refresh_token_${suffix}`,
    account: `dios_google_account_${suffix}`,
    oauthState: "dios_google_oauth_state",
  }
}

export function brokerPath(broker: BrokerId) {
  return broker === "schwab" ? "/schwab-sync" : "/stake-sync"
}
