import { get, put } from "@vercel/blob"
import { NextResponse } from "next/server"

const STORE_PATH = "dios/portfolio-store.json"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface PersistedStore {
  holdings: unknown[]
  cash: number
  transactions: unknown[]
  settings: Record<string, unknown>
  recommendations: unknown[]
}

function isPersistedStore(value: unknown): value is PersistedStore {
  if (!value || typeof value !== "object") return false

  const candidate = value as Partial<PersistedStore>

  return (
    Array.isArray(candidate.holdings) &&
    typeof candidate.cash === "number" &&
    Array.isArray(candidate.transactions) &&
    !!candidate.settings &&
    typeof candidate.settings === "object" &&
    Array.isArray(candidate.recommendations)
  )
}

async function streamToText(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  return new Response(stream).text()
}

export async function GET() {
  try {
    const result = await get(STORE_PATH, {
      access: "private",
    })

    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json(
        {
          data: null,
          updatedAt: null,
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      )
    }

    const raw = await streamToText(result.stream)
    const parsed = JSON.parse(raw) as {
      data?: unknown
      updatedAt?: string
    }

    if (!isPersistedStore(parsed.data)) {
      throw new Error("The stored DIOS portfolio has an invalid format.")
    }

    return NextResponse.json(
      {
        data: parsed.data,
        updatedAt: parsed.updatedAt ?? result.blob.uploadedAt.toISOString(),
        etag: result.blob.etag,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("Unable to read DIOS store:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to read the DIOS portfolio store.",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as unknown

    if (!isPersistedStore(data)) {
      return NextResponse.json(
        {
          error: "The submitted DIOS portfolio has an invalid format.",
        },
        { status: 400 },
      )
    }

    const updatedAt = new Date().toISOString()
    const body = JSON.stringify(
      {
        updatedAt,
        data,
      },
      null,
      2,
    )

    const blob = await put(STORE_PATH, body, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    })

    return NextResponse.json({
      ok: true,
      updatedAt,
      pathname: blob.pathname,
      etag: blob.etag,
    })
  } catch (error) {
    console.error("Unable to save DIOS store:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save the DIOS portfolio store.",
      },
      { status: 500 },
    )
  }
}
