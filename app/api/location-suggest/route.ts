import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type Suggestion = {
  placeId: string
  text: string
  mainText?: string
  secondaryText?: string
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input")?.trim()
  const sessionToken = request.nextUrl.searchParams.get("sessionToken")?.trim()
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY

  if (!input || input.length < 3) {
    return NextResponse.json({ suggestions: [] })
  }

  if (!apiKey) {
    return NextResponse.json(
      { suggestions: [], message: "GOOGLE_MAPS_SERVER_API_KEY is not configured." },
      { status: 500 },
    )
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "suggestions.placePrediction.placeId",
          "suggestions.placePrediction.text.text",
          "suggestions.placePrediction.structuredFormat.mainText.text",
          "suggestions.placePrediction.structuredFormat.secondaryText.text",
        ].join(","),
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ["in"],
        languageCode: "en",
        regionCode: "in",
        ...(sessionToken ? { sessionToken } : {}),
      }),
      cache: "no-store",
    })

    const raw = await response.text()

    if (!response.ok) {
      console.error("Google Places autocomplete failed:", response.status, raw)

      let googleMessage = "Google Places autocomplete request failed."
      try {
        const parsed = JSON.parse(raw)
        googleMessage = parsed?.error?.message || googleMessage
      } catch {
        // Keep fallback message.
      }

      return NextResponse.json(
        {
          suggestions: [],
          message: googleMessage,
          googleStatus: response.status,
        },
        { status: response.status >= 500 ? 502 : 400 },
      )
    }

    const data = JSON.parse(raw)
    const suggestions: Suggestion[] = (data.suggestions ?? [])
      .map((item: any) => {
        const prediction = item.placePrediction
        return {
          placeId: prediction?.placeId,
          text: prediction?.text?.text,
          mainText: prediction?.structuredFormat?.mainText?.text,
          secondaryText: prediction?.structuredFormat?.secondaryText?.text,
        }
      })
      .filter((item: Suggestion) => Boolean(item.placeId && item.text))
      .slice(0, 6)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Google Places autocomplete exception:", error)
    return NextResponse.json(
      {
        suggestions: [],
        message: error instanceof Error ? error.message : "Unable to search Google Places.",
      },
      { status: 500 },
    )
  }
}
