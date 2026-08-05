import crypto from "node:crypto"

export type ProfileRole = "admin" | "investor"

export type DiosProfile = {
  id: "deepak" | "suren"
  name: string
  role: ProfileRole
  pinRequired: boolean
}

export const DIOS_PROFILES: DiosProfile[] = [
  { id: "deepak", name: "Deepak", role: "admin", pinRequired: false },
  { id: "suren", name: "Suren", role: "investor", pinRequired: true },
]

const SUREN_PIN_HASH = "e1cf26ade53997f57712338aeabc1aab46c259c4f88c54d36c6723d63f157983"
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

export function readProfileSession(value?: string | null): DiosProfile["id"] {
  if (!value) return "deepak"
  const [payload, signature] = value.split(".")
  if (!payload || !signature) return "deepak"

  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return "deepak"

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      profileId?: string
      expiresAt?: number
    }
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) return "deepak"
    return parsed.profileId === "suren" ? "suren" : "deepak"
  } catch {
    return "deepak"
  }
}

export function verifyProfilePin(profileId: string, pin: string) {
  if (profileId === "deepak") return true
  if (profileId !== "suren") return false
  const actual = crypto
    .createHash("sha256")
    .update(`suren:${pin}:DIOS-profile-pin-v1`)
    .digest("hex")
  const a = Buffer.from(actual)
  const b = Buffer.from(SUREN_PIN_HASH)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export const PROFILE_COOKIE_NAME = COOKIE_NAME
