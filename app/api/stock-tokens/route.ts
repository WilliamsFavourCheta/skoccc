import { NextResponse } from "next/server";
import { getOfficialStockTokens } from "../../lib/stock-tokens";
import { isSupportedChainId } from "../../web3/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedChainId = Number(searchParams.get("chainId"));
  const includePrices = searchParams.get("includePrices") === "1";
  const chainId = isSupportedChainId(requestedChainId)
    ? requestedChainId
    : undefined;

  try {
    const tokens = await getOfficialStockTokens(chainId, { includePrices });

    return NextResponse.json({ tokens });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load Robinhood Stock Tokens.";

    return NextResponse.json({ error: message, tokens: [] }, { status: 502 });
  }
}
