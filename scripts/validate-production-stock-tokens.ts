import hre from "hardhat";

const { ethers, network } = hre;
const PRODUCTION_CHAIN_ID = 4663;
const STOCK_TOKEN_API_BASE =
  process.env.ROBINHOOD_STOCK_TOKEN_API_BASE ??
  "https://api.robinhood.com/rhj";
const RPC_DELAY_MS = Number(process.env.STOCK_TOKEN_VALIDATION_RPC_DELAY_MS ?? 350);
const RETRY_COUNT = Number(process.env.STOCK_TOKEN_VALIDATION_RETRIES ?? 5);
const BACKOFF_BASE_MS = Number(
  process.env.STOCK_TOKEN_VALIDATION_BACKOFF_BASE_MS ?? 800,
);

const erc20ProbeAbi = [
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
] as const;

type RobinhoodDeployment = {
  contractAddress?: string;
  chainId?: number | string;
};

type RobinhoodAsset = {
  id?: string;
  tokenSymbol?: string;
  tokenName?: string;
  deployments?: RobinhoodDeployment[];
  currentMultiplier?: string;
  status?: string;
  tradingCapabilities?: Record<string, unknown> | null;
};

type RobinhoodAssetsResponse = {
  assets?: RobinhoodAsset[];
};

type ValidationStatus = "PASS" | "FAIL" | "UNVERIFIED";

type ValidationResult = {
  symbol: string;
  name: string;
  address: string;
  decimals: string;
  status: ValidationStatus;
  issues: string;
};

type RetryResult<T> =
  | { ok: true; value: T }
  | { ok: false; retryable: boolean; issue: string };

const successfulValidationCache = new Map<string, ValidationResult>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireString(value: unknown, field: string, issues: string[]) {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`missing ${field}`);
    return "";
  }

  return value.trim();
}

function getSelectedSymbols() {
  const configured = process.env.STOCK_TOKEN_VALIDATION_SYMBOLS;

  if (!configured?.trim()) return null;

  return new Set(
    configured
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean),
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getErrorCode(error: unknown) {
  return error && typeof error === "object"
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}

function isRetryableRpcError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error).toLowerCase();

  return (
    message.includes("too many requests") ||
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("socket") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("server error") ||
    message.includes("bad response") ||
    code.includes("timeout") ||
    code.includes("network") ||
    code.includes("server")
  );
}

async function withRetry<T>(
  label: string,
  action: () => Promise<T>,
): Promise<RetryResult<T>> {
  let lastRetryableIssue = "";

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    if (RPC_DELAY_MS > 0) await sleep(RPC_DELAY_MS);

    try {
      return { ok: true, value: await action() };
    } catch (error) {
      const message = getErrorMessage(error);

      if (!isRetryableRpcError(error)) {
        return {
          ok: false,
          retryable: false,
          issue: `${label} failed: ${message}`,
        };
      }

      lastRetryableIssue = `${label} unverified after RPC/network error: ${message}`;

      if (attempt < RETRY_COUNT) {
        const backoff = BACKOFF_BASE_MS * 2 ** (attempt - 1);
        console.warn(
          `${label}: retryable RPC error on attempt ${attempt}/${RETRY_COUNT}. Retrying in ${backoff}ms.`,
        );
        await sleep(backoff);
      }
    }
  }

  return {
    ok: false,
    retryable: true,
    issue: lastRetryableIssue || `${label} unverified after retries.`,
  };
}

async function fetchOfficialAssets() {
  const result = await withRetry("Robinhood Stock Token registry", async () => {
    const response = await fetch(`${STOCK_TOKEN_API_BASE}/assets`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as RobinhoodAssetsResponse;
  });

  if (!result.ok) {
    const failedResult = result as Extract<RetryResult<RobinhoodAssetsResponse>, { ok: false }>;
    throw new Error(failedResult.issue);
  }

  return result.value.assets ?? [];
}

function getProductionDeployment(asset: RobinhoodAsset) {
  return asset.deployments?.find(
    (item) => Number(item.chainId) === PRODUCTION_CHAIN_ID,
  );
}

async function validateErc20Read<T>(
  label: string,
  action: () => Promise<T>,
  issues: string[],
  unverifiedIssues: string[],
) {
  const result = await withRetry(label, action);

  if (result.ok) return result.value;

  const failedResult = result as Extract<RetryResult<T>, { ok: false }>;

  if (failedResult.retryable) {
    unverifiedIssues.push(failedResult.issue);
  } else {
    issues.push(failedResult.issue);
  }

  return null;
}

async function validateToken(asset: RobinhoodAsset): Promise<ValidationResult | null> {
  const issues: string[] = [];
  const unverifiedIssues: string[] = [];

  if (asset.status !== "ASSET_STATUS_ACTIVE") return null;

  const deployment = getProductionDeployment(asset);

  if (!deployment) return null;

  const symbol = requireString(asset.tokenSymbol, "tokenSymbol", issues);
  const name = requireString(asset.tokenName, "tokenName", issues);
  const address = requireString(
    deployment.contractAddress,
    "deployment.contractAddress",
    issues,
  );

  requireString(asset.id, "id", issues);
  requireString(asset.currentMultiplier, "currentMultiplier", issues);

  if (!ethers.isAddress(address)) {
    issues.push("invalid contract address");
    return {
      symbol: symbol || "UNKNOWN",
      name: name || "UNKNOWN",
      address,
      decimals: "n/a",
      status: "FAIL",
      issues: issues.join("; "),
    };
  }

  const checksummedAddress = ethers.getAddress(address);
  const cached = successfulValidationCache.get(checksummedAddress.toLowerCase());

  if (cached) {
    return { ...cached, symbol: symbol || cached.symbol, name: name || cached.name };
  }

  let decimals = "n/a";
  const code = await withRetry(`${symbol || checksummedAddress} getCode`, () =>
    ethers.provider.getCode(checksummedAddress),
  );

  if (!code.ok) {
    const failedCode = code as Extract<RetryResult<string>, { ok: false }>;

    if (failedCode.retryable) unverifiedIssues.push(failedCode.issue);
    else issues.push(failedCode.issue);
  } else if (code.value === "0x") {
    issues.push("no contract code at address");
  }

  if (code.ok && code.value !== "0x") {
    const token = new ethers.Contract(
      checksummedAddress,
      erc20ProbeAbi,
      ethers.provider,
    );
    const onchainDecimals = await validateErc20Read(
      `${symbol || checksummedAddress} decimals`,
      () => token.decimals() as Promise<bigint | number>,
      issues,
      unverifiedIssues,
    );
    const onchainSymbol = await validateErc20Read(
      `${symbol || checksummedAddress} symbol`,
      () => token.symbol() as Promise<string>,
      issues,
      unverifiedIssues,
    );
    const onchainName = await validateErc20Read(
      `${symbol || checksummedAddress} name`,
      () => token.name() as Promise<string>,
      issues,
      unverifiedIssues,
    );

    await validateErc20Read(
      `${symbol || checksummedAddress} totalSupply`,
      () => token.totalSupply() as Promise<bigint>,
      issues,
      unverifiedIssues,
    );
    await validateErc20Read(
      `${symbol || checksummedAddress} balanceOf`,
      () => token.balanceOf(ethers.ZeroAddress) as Promise<bigint>,
      issues,
      unverifiedIssues,
    );
    await validateErc20Read(
      `${symbol || checksummedAddress} allowance`,
      () =>
        token.allowance(
          ethers.ZeroAddress,
          ethers.ZeroAddress,
        ) as Promise<bigint>,
      issues,
      unverifiedIssues,
    );

    if (onchainDecimals !== null) {
      const normalizedDecimals = Number(onchainDecimals);
      decimals = normalizedDecimals.toString();

      if (normalizedDecimals !== 18) {
        issues.push(`expected 18 decimals, got ${normalizedDecimals}`);
      }
    }

    if (onchainSymbol !== null && onchainSymbol.length === 0) {
      issues.push("empty on-chain symbol");
    }

    if (onchainName !== null && onchainName.length === 0) {
      issues.push("empty on-chain name");
    }
  }

  const status: ValidationStatus =
    issues.length > 0
      ? "FAIL"
      : unverifiedIssues.length > 0
        ? "UNVERIFIED"
        : "PASS";
  const result = {
    symbol: symbol || "UNKNOWN",
    name: name || "UNKNOWN",
    address: checksummedAddress,
    decimals,
    status,
    issues:
      issues.length > 0
        ? issues.join("; ")
        : unverifiedIssues.length > 0
          ? unverifiedIssues.join("; ")
          : "-",
  };

  if (status === "PASS") {
    successfulValidationCache.set(checksummedAddress.toLowerCase(), result);
  }

  return result;
}

function applyDuplicateAddressFailures(results: ValidationResult[]) {
  const duplicateAddresses = new Set<string>();
  const seenAddresses = new Set<string>();

  for (const result of results) {
    const key = result.address.toLowerCase();

    if (seenAddresses.has(key)) duplicateAddresses.add(result.address);
    seenAddresses.add(key);
  }

  for (const result of results) {
    if (duplicateAddresses.has(result.address)) {
      result.status = "FAIL";
      result.issues =
        result.issues === "-"
          ? "duplicate production deployment address"
          : `${result.issues}; duplicate production deployment address`;
    }
  }
}

async function main() {
  if (!process.env.ROBINHOOD_MAINNET_RPC_URL?.trim()) {
    throw new Error(
      "ROBINHOOD_MAINNET_RPC_URL is required to validate Robinhood Chain mainnet Stock Tokens.",
    );
  }

  if (network.config.chainId !== PRODUCTION_CHAIN_ID) {
    throw new Error(
      `Run this validation against Robinhood Chain mainnet ${PRODUCTION_CHAIN_ID}.`,
    );
  }

  const selectedSymbols = getSelectedSymbols();
  const assets = await fetchOfficialAssets();
  const productionAssets = assets.filter((asset) => {
    if (!getProductionDeployment(asset)) return false;
    if (!selectedSymbols) return true;

    return selectedSymbols.has((asset.tokenSymbol ?? "").toUpperCase());
  });
  const results: ValidationResult[] = [];

  for (const asset of productionAssets) {
    const symbol = asset.tokenSymbol ?? "UNKNOWN";

    console.log(`Validating ${symbol}...`);

    const result = await validateToken(asset);

    if (result) results.push(result);
  }

  applyDuplicateAddressFailures(results);

  const passed = results.filter((result) => result.status === "PASS");
  const failed = results.filter((result) => result.status === "FAIL");
  const unverified = results.filter((result) => result.status === "UNVERIFIED");

  console.log(`Robinhood registry assets: ${assets.length}`);
  console.log(`Production deployments on ${PRODUCTION_CHAIN_ID}: ${results.length}`);

  if (selectedSymbols) {
    console.log(
      `Filtered symbols: ${Array.from(selectedSymbols).sort().join(", ")}`,
    );
  }

  console.table(results);
  console.log(
    `Final counts: PASS=${passed.length} FAIL=${failed.length} UNVERIFIED=${unverified.length}`,
  );

  if (failed.length > 0) {
    console.error("Actual incompatible tokens:");
    console.table(failed);
    process.exitCode = 1;
  } else {
    console.log("Actual incompatible tokens: none");
  }

  if (unverified.length > 0) {
    console.warn("Unverified tokens due to RPC/network/rate-limit errors:");
    console.table(unverified);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
