import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DATA_PATH = "data/portfolio.json"

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
    throw new Error(
      "Missing GitHub storage configuration. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO in Vercel.",
    )
  }

  return { token, owner, repo, branch }
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  }
}

function contentUrl(owner: string, repo: string, branch: string) {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${DATA_PATH}?ref=${encodeURIComponent(branch)}`
}

function decodeBase64(value: string) {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8")
}

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64")
}

async function readGitHubFile() {
  const { token, owner, repo, branch } = config()
  const response = await fetch(contentUrl(owner, repo, branch), {
    method: "GET",
    headers: githubHeaders(token),
    cache: "no-store",
  })

  if (response.status === 404) {
    return { data: null, sha: null }
  }

  const payload = (await response.json()) as GitHubContent

  if (!response.ok) {
    throw new Error(payload.message || `GitHub read failed (${response.status})`)
  }

  if (!payload.content || payload.encoding !== "base64") {
    throw new Error("GitHub returned an invalid portfolio file.")
  }

  return {
    data: JSON.parse(decodeBase64(payload.content)) as unknown,
    sha: payload.sha ?? null,
  }
}

export async function GET() {
  try {
    const result = await readGitHubFile()

    return NextResponse.json(
      { data: result.data },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    )
  } catch (error) {
    console.error("DIOS GitHub store GET failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to read the DIOS cloud store.",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json(
        { error: "The portfolio payload must be a JSON object." },
        { status: 400 },
      )
    }

    const { token, owner, repo, branch } = config()
    const current = await readGitHubFile()

    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${DATA_PATH}`,
      {
        method: "PUT",
        headers: githubHeaders(token),
        body: JSON.stringify({
          message: current.sha
            ? "Update DIOS portfolio cloud data"
            : "Create DIOS portfolio cloud data",
          content: encodeBase64(JSON.stringify(data, null, 2)),
          branch,
          ...(current.sha ? { sha: current.sha } : {}),
        }),
        cache: "no-store",
      },
    )

    const payload = (await response.json()) as GitHubContent

    if (!response.ok) {
      throw new Error(payload.message || `GitHub save failed (${response.status})`)
    }

    return NextResponse.json({
      ok: true,
      savedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("DIOS GitHub store POST failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save the DIOS cloud store.",
      },
      { status: 500 },
    )
  }
}
