import { NextRequest, NextResponse } from "next/server"
import surenSeed from "@/data/profiles/suren.json"
import { PROFILE_COOKIE_NAME, readProfileSession } from "@/lib/dios/profile-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type GitHubContent = {
  content?: string
  encoding?: string
  sha?: string
  message?: string
}

function config() {
  const token = process.env.GITHUB_TOKEN?.trim()
  const owner = process.env.GITHUB_OWNER?.trim()
  const repo = process.env.GITHUB_REPO?.trim()
  const branch = process.env.GITHUB_BRANCH?.trim() || "main"
  if (!token || !owner || !repo) {
    throw new Error("Missing GitHub storage configuration. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO in Vercel.")
  }
  return { token, owner, repo, branch }
}

function activeProfile(request: NextRequest): string {
  const profileId = readProfileSession(request.cookies.get(PROFILE_COOKIE_NAME)?.value)
  if (!profileId) throw new Error("Fundly profile is locked. Enter your PIN to continue.")
  return profileId
}

function dataPath(profileId: string) {
  if (profileId === "deepak") return "data/portfolio.json"
  const safeId = profileId.toLowerCase().replace(/[^a-z0-9_-]/g, "")
  if (!safeId) throw new Error("Invalid profile identifier.")
  return `data/profiles/${safeId}.json`
}

function headers(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  }
}

function getUrl(owner: string, repo: string, branch: string, path: string) {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`
}

function putUrl(owner: string, repo: string, path: string) {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`
}

function decode(value: string) {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8")
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64")
}

async function readFile(profileId: string) {
  const { token, owner, repo, branch } = config()
  const path = dataPath(profileId)
  const response = await fetch(getUrl(owner, repo, branch, path), {
    method: "GET",
    headers: headers(token),
    cache: "no-store",
  })

  if (response.status === 404) {
    return { data: profileId === "suren" ? surenSeed : null, sha: null }
  }

  const payload = (await response.json()) as GitHubContent
  if (!response.ok) throw new Error(payload.message || `GitHub read failed (${response.status})`)
  if (!payload.content || payload.encoding !== "base64") throw new Error("GitHub returned an invalid portfolio file.")
  return { data: JSON.parse(decode(payload.content)) as unknown, sha: payload.sha ?? null }
}

export async function GET(request: NextRequest) {
  try {
    const profileId = activeProfile(request)
    const result = await readFile(profileId)
    return NextResponse.json(
      { data: result.data, sha: result.sha, profileId },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    )
  } catch (error) {
    console.error("DIOS cloud GET failed:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read cloud data." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { data?: unknown; baseSha?: string | null }
    if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      return NextResponse.json({ error: "Invalid portfolio payload." }, { status: 400 })
    }

    const profileId = activeProfile(request)
    const path = dataPath(profileId)
    const { token, owner, repo, branch } = config()
    const current = await readFile(profileId)

    if (body.baseSha && current.sha && body.baseSha !== current.sha) {
      return NextResponse.json(
        { error: "Cloud data changed in another browser. Reloading is required.", conflict: true, sha: current.sha, data: current.data },
        { status: 409 },
      )
    }

    const response = await fetch(putUrl(owner, repo, path), {
      method: "PUT",
      headers: headers(token),
      body: JSON.stringify({
        message: current.sha ? `Update DIOS ${profileId} portfolio data` : `Create DIOS ${profileId} portfolio data`,
        content: encode(JSON.stringify(body.data, null, 2)),
        branch,
        ...(current.sha ? { sha: current.sha } : {}),
      }),
      cache: "no-store",
    })

    const payload = (await response.json()) as { content?: { sha?: string }; message?: string }
    if (!response.ok) throw new Error(payload.message || `GitHub save failed (${response.status})`)
    return NextResponse.json({ ok: true, profileId, sha: payload.content?.sha ?? null, savedAt: new Date().toISOString() })
  } catch (error) {
    console.error("DIOS cloud POST failed:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save cloud data." }, { status: 500 })
  }
}
