import { NextRequest, NextResponse } from "next/server"
import {
  createProfileSession,
  DIOS_PROFILES,
  PROFILE_COOKIE_NAME,
  readProfileSession,
  verifyProfilePin,
} from "@/lib/dios/profile-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const attempts = new Map<string, { count: number; lockedUntil: number }>()

function clientKey(request: NextRequest, profileId: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return `${forwarded || "unknown"}:${profileId}`
}

export async function GET(request: NextRequest) {
  const activeProfileId = readProfileSession(request.cookies.get(PROFILE_COOKIE_NAME)?.value)
  return NextResponse.json(
    { profiles: DIOS_PROFILES, activeProfileId },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    profileId?: string
    pin?: string
  } | null

  const profile = DIOS_PROFILES.find((item) => item.id === body?.profileId)
  if (!profile) return NextResponse.json({ error: "Unknown profile." }, { status: 404 })

  const key = clientKey(request, profile.id)
  const attempt = attempts.get(key)
  if (attempt && attempt.lockedUntil > Date.now()) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Try again in five minutes." },
      { status: 429 },
    )
  }

  if (!verifyProfilePin(profile.id, String(body?.pin ?? ""))) {
    const nextCount = (attempt?.count ?? 0) + 1
    attempts.set(key, {
      count: nextCount >= 5 ? 0 : nextCount,
      lockedUntil: nextCount >= 5 ? Date.now() + 5 * 60 * 1000 : 0,
    })
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 })
  }

  attempts.delete(key)
  const response = NextResponse.json({ ok: true, activeProfileId: profile.id })
  response.cookies.set(PROFILE_COOKIE_NAME, createProfileSession(profile.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 12 * 60 * 60,
    path: "/",
  })
  return response
}
