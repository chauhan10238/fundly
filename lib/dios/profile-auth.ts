import crypto from "node:crypto"

export type ProfileRole = "admin" | "investor"

export type DiosProfile = {
  id: "deepak" | "suren"
  name: string
  role: ProfileRole
  pinRequired: boolean
}

export const DIOS_PROFILES: DiosProfile[] = [
  { id: "deepak", name: "Deepak", role: "admin", pinRequired: true },
  { id: "suren", name: "Suren", role: "investor", pinRequired: true },
]

const PROFILE_PIN_HASHES: Record<DiosProfile["id"], string> = {
  deepak: "bf0bfbca4f3c39e51ae7a07ab82d6f9adff073fbe058b8c5169c50cb65733d0f",
  suren: "e1cf26ade53997f57712338aeabc1aab46c259c4f88c54d36c6723d63f157983",
}
const COOKIE_NAME = "dios_profile_session"

function secret() {
  return (
    process.env.PROFILE_SESSION_SECRET?.trim() ||
    process.env.TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.OAUTH_STATE_SECRET?.trim() ||
    "dios-development-profile-secret-change-in-vercel"
  )
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url")
}

export function createProfileSession(profileId: DiosProfile["id"]) {
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000
  const payload = Buffer.from(JSON.stringify({ profileId, expiresAt }), "utf8").toString("base64url")
  return `${payload}.${sign(payload)}`
}

export function readProfileSession(value?: string | null): DiosProfile["id"] | null {
  if (!value) return null
  const [payload, signature] = value.split(".")
  if (!payload || !signature) return null

  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      profileId?: string
      expiresAt?: number
    }
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) return null
    return parsed.profileId === "suren" ? "suren" : parsed.profileId === "deepak" ? "deepak" : null
  } catch {
    return null
  }
}

export function verifyProfilePin(profileId: string, pin: string) {
  if (profileId !== "deepak" && profileId !== "suren") return false
  const actual = crypto
    .createHash("sha256")
    .update(`${profileId}:${pin}:DIOS-profile-pin-v1`)
    .digest("hex")
  const expected = PROFILE_PIN_HASHES[profileId]
  const a = Buffer.from(actual)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export const PROFILE_COOKIE_NAME = COOKIE_NAME
