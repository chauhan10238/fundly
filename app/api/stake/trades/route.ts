import { NextRequest, NextResponse } from "next/server";
import { decryptToken } from "@/lib/gmail/crypto";
import { listParsedStakeTrades } from "@/lib/gmail/stake-trades";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const encryptedToken = request.cookies.get(
      "dios_google_refresh_token",
    )?.value;

    if (!encryptedToken) {
      return NextResponse.json(
        { connected: false, trades: [] },
        { status: 401 },
      );
    }

    const refreshToken = decryptToken(encryptedToken);
    const trades = await listParsedStakeTrades(refreshToken, 100);

    return NextResponse.json({
      connected: true,
      scannedAt: new Date().toISOString(),
      count: trades.length,
      ready: trades.filter((trade) => trade.status === "Ready").length,
      needsReview: trades.filter((trade) => trade.status === "Needs Review").length,
      trades,
    });
  } catch (error) {
    console.error("Stake trade parsing failed", error);

    return NextResponse.json(
      {
        connected: true,
        error:
          error instanceof Error
            ? error.message
            : "Unable to parse Stake trade confirmations",
        trades: [],
      },
      { status: 500 },
    );
  }
}
