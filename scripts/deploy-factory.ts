import hre from "hardhat";

const { ethers, network } = hre;
const STOCK_TOKEN_API_BASE =
  process.env.ROBINHOOD_STOCK_TOKEN_API_BASE ??
  "https://api.robinhood.com/rhj";

type RobinhoodAsset = {
  tokenSymbol: string;
  status: string;
  deployments: Array<{
    contractAddress: string;
    chainId: number;
  }>;
};

type RobinhoodAssetsResponse = {
  assets?: RobinhoodAsset[];
};

function validateAddressList(addresses: string[], source: string) {
  const seen = new Set<string>();

  return addresses.map((address) => {
    if (!ethers.isAddress(address)) {
      throw new Error(`Invalid ${source} entry: ${address}`);
    }

    const checksummed = ethers.getAddress(address);
    const key = checksummed.toLowerCase();

    if (seen.has(key)) {
      throw new Error(`Duplicate ${source} entry: ${checksummed}`);
    }

    seen.add(key);
    return checksummed;
  });
}

function parseEnvAddresses() {
  const configured = process.env.STOCK_TOKEN_ADDRESSES;

  if (!configured) return [];

  const addresses = configured
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  return validateAddressList(addresses, "STOCK_TOKEN_ADDRESSES");
}

async function fetchOfficialTokenAddresses(chainId: number) {
  const response = await fetch(`${STOCK_TOKEN_API_BASE}/assets`);

  if (!response.ok) {
    throw new Error(`Robinhood Stock Token API failed: ${response.status}`);
  }

  const data = (await response.json()) as RobinhoodAssetsResponse;

  const addresses =
    data.assets
      ?.filter((asset) => asset.status === "ASSET_STATUS_ACTIVE")
      .map((asset) =>
        asset.deployments.find((deployment) => deployment.chainId === chainId),
      )
      .filter((deployment): deployment is NonNullable<typeof deployment> =>
        Boolean(deployment),
      )
      .map((deployment) => deployment.contractAddress) ?? [];

  return validateAddressList(addresses, "official Robinhood registry");
}

async function getApprovedTokenAddresses() {
  const chainId = network.config.chainId;

  if (chainId === 4663) {
    if (!process.env.ROBINHOOD_MAINNET_RPC_URL?.trim()) {
      throw new Error(
        "ROBINHOOD_MAINNET_RPC_URL is required for Robinhood mainnet factory deployment.",
      );
    }

    if (process.env.STOCK_TOKEN_ADDRESSES?.trim()) {
      throw new Error(
        "STOCK_TOKEN_ADDRESSES is disabled on Robinhood mainnet. Mainnet factory deployment must use the official Robinhood Stock Token registry.",
      );
    }

    return fetchOfficialTokenAddresses(chainId);
  }

  const envAddresses = parseEnvAddresses();

  if (envAddresses.length > 0) return envAddresses;

  if (chainId === 46630) {
    throw new Error(
      "No official Robinhood Stock Token registry entries are expected on testnet. Use npm run contracts:deploy:factory:testnet to deploy mock tokens plus the factory, or set STOCK_TOKEN_ADDRESSES explicitly.",
    );
  }

  throw new Error(
    "Set STOCK_TOKEN_ADDRESSES for local/custom networks. Official registry auto-load only runs for Robinhood Chain mainnet.",
  );
}

async function main() {
  if (network.name !== "hardhat" && !process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error("DEPLOYER_PRIVATE_KEY is required for non-local deployments.");
  }

  const approvedTokens = await getApprovedTokenAddresses();

  if (approvedTokens.length === 0) {
    throw new Error("No approved Stock Token addresses found.");
  }

  const Factory = await ethers.getContractFactory("BasketFactory");
  const factory = await Factory.deploy(approvedTokens);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  const chainId = network.config.chainId;

  console.log(`BasketFactory deployed: ${factoryAddress}`);
  console.log(`Approved Stock Tokens: ${approvedTokens.length}`);
  console.log(`NEXT_PUBLIC_BASKET_FACTORY_ADDRESS_${chainId}=${factoryAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
