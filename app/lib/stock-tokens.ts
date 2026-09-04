import { isAddress, type Address } from "viem";
import {
  ROBINHOOD_MAINNET_CHAIN_ID,
  ROBINHOOD_TESTNET_CHAIN_ID,
} from "../web3/chains";

const STOCK_TOKEN_API_BASE =
  process.env.ROBINHOOD_STOCK_TOKEN_API_BASE ??
  "https://api.robinhood.com/rhj";

type RobinhoodDeployment = {
  contractAddress: Address;
  chainId: number;
};

type RobinhoodAsset = {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  deployments: RobinhoodDeployment[];
  currentMultiplier: string;
  pendingMultiplier?: string;
  pendingMultiplierEffectiveTime?: string;
  logoUrl?: string;
  status: string;
  tradingCapabilities?: Record<string, unknown> | null;
};

type RobinhoodAssetsResponse = {
  assets?: RobinhoodAsset[];
};

type RobinhoodPriceQuote = {
  tokenSymbol: string;
  bid: string;
  ask: string;
  currency: string;
  dailyTradingVolume: string;
  isTradingHalt: boolean;
  generatedAt: string;
};

type RobinhoodPriceResponse = {
  quotes?: RobinhoodPriceQuote[];
};

export type OfficialStockToken = {
  id: string;
  symbol: string;
  name: string;
  contractAddress: Address;
  chainId: number;
  priceUsd: number | null;
  logoUrl: string | null;
  currentMultiplier: string;
  tradingCapabilities: Record<string, unknown> | null;
  status: string;
};

type GetOfficialStockTokensOptions = {
  includePrices?: boolean;
};

type TestnetMockStockToken = {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;
  contractAddress?: unknown;
  chainId?: unknown;
  priceUsd?: unknown;
  logoUrl?: unknown;
  currentMultiplier?: unknown;
  tradingCapabilities?: unknown;
  status?: unknown;
};

function getRequiredString(
  token: TestnetMockStockToken,
  field: "symbol" | "name" | "contractAddress",
) {
  const value = token[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Invalid ROBINHOOD_TESTNET_MOCK_STOCK_TOKENS entry: missing ${field}.`,
    );
  }

  return value.trim();
}

function getOptionalString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function getOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getMultiplierNumber(value: unknown) {
  const multiplier = Number(value);

  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
}

function getOptionalRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseMockChainId(value: unknown) {
  const chainId = Number(value ?? ROBINHOOD_TESTNET_CHAIN_ID);

  return Number.isFinite(chainId) ? chainId : ROBINHOOD_TESTNET_CHAIN_ID;
}

function parseMockRegistryJson(configured: string) {
  const trimmed = configured.trim();
  let parsed: unknown = JSON.parse(trimmed);

  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  return parsed;
}

function getTestnetMockStockTokens(): OfficialStockToken[] {
  const configured = process.env.ROBINHOOD_TESTNET_MOCK_STOCK_TOKENS;

  if (!configured) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = parseMockRegistryJson(configured);
  } catch {
    throw new Error("ROBINHOOD_TESTNET_MOCK_STOCK_TOKENS must be valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("ROBINHOOD_TESTNET_MOCK_STOCK_TOKENS must be a JSON array.");
  }

  return parsed.map((token: TestnetMockStockToken, index) => {
    const symbol = getRequiredString(token, "symbol").toUpperCase();
    const name = getRequiredString(token, "name");
    const contractAddress = getRequiredString(token, "contractAddress");
    const chainId = parseMockChainId(token.chainId);

    if (chainId !== ROBINHOOD_TESTNET_CHAIN_ID) {
      throw new Error(
        `Invalid testnet mock ${symbol}: chainId must be ${ROBINHOOD_TESTNET_CHAIN_ID}.`,
      );
    }

    if (!isAddress(contractAddress)) {
      throw new Error(`Invalid testnet mock ${symbol}: bad contract address.`);
    }

    return {
      id: getOptionalString(token.id, `testnet-mock-${index}-${symbol}`),
      symbol,
      name,
      contractAddress,
      chainId,
      priceUsd: getOptionalNumber(token.priceUsd),
      logoUrl:
        typeof token.logoUrl === "string" && token.logoUrl.trim().length > 0
          ? token.logoUrl.trim()
          : null,
      currentMultiplier: getOptionalString(token.currentMultiplier, "1"),
      tradingCapabilities: getOptionalRecord(token.tradingCapabilities),
      status: getOptionalString(token.status, "ASSET_STATUS_ACTIVE"),
    };
  });
}

async function fetchJson<T>(path: string, revalidate: number): Promise<T> {
  const response = await fetch(`${STOCK_TOKEN_API_BASE}${path}`, {
    headers: { accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Robinhood Stock Token API failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<U>,
) {
  const results: U[] = [];

  for (let index = 0; index < items.length; index += limit) {
    const chunk = items.slice(index, index + limit);
    results.push(...(await Promise.all(chunk.map(mapper))));
  }

  return results;
}

async function fetchTokenPrice(symbol: string) {
  try {
    const data = await fetchJson<RobinhoodPriceResponse>(
      `/prices/${encodeURIComponent(symbol)}`,
      15,
    );
    const quote = data.quotes?.find((item) => item.tokenSymbol === symbol);
    const bid = Number(quote?.bid);
    const ask = Number(quote?.ask);

    if (Number.isFinite(bid) && Number.isFinite(ask)) return (bid + ask) / 2;
    if (Number.isFinite(ask)) return ask;
    if (Number.isFinite(bid)) return bid;
  } catch {
    return null;
  }

  return null;
}

export async function getOfficialStockTokens(
  chainId = ROBINHOOD_MAINNET_CHAIN_ID,
  options: GetOfficialStockTokensOptions = {},
): Promise<OfficialStockToken[]> {
  if (chainId === ROBINHOOD_TESTNET_CHAIN_ID) {
    return getTestnetMockStockTokens();
  }

  if (chainId !== ROBINHOOD_MAINNET_CHAIN_ID) {
    return [];
  }

  const data = await fetchJson<RobinhoodAssetsResponse>("/assets", 60);
  const activeAssets =
    data.assets?.filter((asset) => asset.status === "ASSET_STATUS_ACTIVE") ?? [];
  const deployedAssets = activeAssets
    .map((asset) => {
      const deployment = asset.deployments.find(
        (item) => item.chainId === chainId,
      );

      if (!deployment) return null;

      return { asset, deployment };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const prices = options.includePrices
    ? await mapWithConcurrency(
        deployedAssets,
        8,
        ({ asset }) => fetchTokenPrice(asset.tokenSymbol),
      )
    : deployedAssets.map(() => null);

  return deployedAssets.map(({ asset, deployment }, index) => {
    const rawUnderlyingPriceUsd = prices[index];
    const currentMultiplier = asset.currentMultiplier;

    return {
      id: asset.id,
      symbol: asset.tokenSymbol,
      name: asset.tokenName,
      contractAddress: deployment.contractAddress,
      chainId: deployment.chainId,
      priceUsd:
        rawUnderlyingPriceUsd === null
          ? null
          : rawUnderlyingPriceUsd * getMultiplierNumber(currentMultiplier),
      logoUrl: asset.logoUrl ?? null,
      currentMultiplier,
      tradingCapabilities: asset.tradingCapabilities ?? null,
      status: asset.status,
    };
  });
}
