import hre from "hardhat";

const { ethers, network } = hre;
const PRODUCTION_CHAIN_ID = 4663;
const STOCK_TOKEN_API_BASE = "https://api.robinhood.com/rhj";
const SAFETY_MARGIN_BPS = 12_500;
const BASIS_POINTS = 10_000n;

type RobinhoodDeployment = {
  contractAddress?: string;
  chainId?: number | string;
};

type RobinhoodAsset = {
  status?: string;
  deployments?: RobinhoodDeployment[];
};

type RobinhoodAssetsResponse = {
  assets?: RobinhoodAsset[];
};

function getDeployerAddress() {
  const configuredAddress = process.env.DEPLOYER_ADDRESS?.trim();

  if (configuredAddress) {
    if (!ethers.isAddress(configuredAddress)) {
      throw new Error("DEPLOYER_ADDRESS must be a valid EVM address.");
    }

    const resolvedAddress = ethers.getAddress(configuredAddress);

    if (resolvedAddress === ethers.ZeroAddress) {
      throw new Error("DEPLOYER_ADDRESS must not be the zero address.");
    }

    return resolvedAddress;
  }

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();

  if (!privateKey) {
    throw new Error(
      "Set DEPLOYER_ADDRESS, or DEPLOYER_PRIVATE_KEY for local address derivation, before estimating deployment cost.",
    );
  }

  const resolvedAddress = new ethers.Wallet(privateKey).address;

  if (resolvedAddress === ethers.ZeroAddress) {
    throw new Error("Resolved deployer address must not be the zero address.");
  }

  return resolvedAddress;
}

function validateOfficialAddresses(addresses: string[]) {
  const seen = new Set<string>();

  return addresses.map((address) => {
    if (!ethers.isAddress(address)) {
      throw new Error(`Official Robinhood registry returned an invalid address: ${address}`);
    }

    const checksummed = ethers.getAddress(address);
    const key = checksummed.toLowerCase();

    if (seen.has(key)) {
      throw new Error(
        `Official Robinhood registry returned a duplicate mainnet deployment: ${checksummed}`,
      );
    }

    seen.add(key);
    return checksummed;
  });
}

async function fetchOfficialMainnetStockTokenAddresses() {
  const response = await fetch(`${STOCK_TOKEN_API_BASE}/assets`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Robinhood Stock Token registry failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as RobinhoodAssetsResponse;
  const addresses =
    data.assets
      ?.filter((asset) => asset.status === "ASSET_STATUS_ACTIVE")
      .map((asset) =>
        asset.deployments?.find(
          (deployment) => Number(deployment.chainId) === PRODUCTION_CHAIN_ID,
        ),
      )
      .filter((deployment): deployment is RobinhoodDeployment & { contractAddress: string } =>
        Boolean(deployment?.contractAddress),
      )
      .map((deployment) => deployment.contractAddress) ?? [];

  return validateOfficialAddresses(addresses);
}

function formatEth(value: bigint) {
  return ethers.formatEther(value);
}

async function main() {
  const rpcUrl = process.env.ROBINHOOD_MAINNET_RPC_URL?.trim();

  if (!rpcUrl) {
    throw new Error("ROBINHOOD_MAINNET_RPC_URL is required for mainnet estimation.");
  }

  if (network.name !== "robinhood" || network.config.chainId !== PRODUCTION_CHAIN_ID) {
    throw new Error(
      `Run this read-only estimator with --network robinhood (Robinhood Chain ${PRODUCTION_CHAIN_ID}).`,
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl, PRODUCTION_CHAIN_ID);
  const chain = await provider.getNetwork();

  if (chain.chainId !== BigInt(PRODUCTION_CHAIN_ID)) {
    throw new Error(
      `ROBINHOOD_MAINNET_RPC_URL returned chain ${chain.chainId}, expected ${PRODUCTION_CHAIN_ID}.`,
    );
  }

  const deployerAddress = getDeployerAddress();
  console.log("READ-ONLY: no transaction will be signed or broadcast.");
  console.log(`Resolved chain ID: ${chain.chainId.toString()}`);
  console.log(`Resolved deployer: ${deployerAddress}`);

  const approvedTokens = await fetchOfficialMainnetStockTokenAddresses();

  if (approvedTokens.length === 0) {
    throw new Error("No active official Robinhood mainnet Stock Token deployments found.");
  }

  const Factory = await ethers.getContractFactory("BasketFactory");
  const deployment = await Factory.getDeployTransaction(approvedTokens);

  if (!deployment.data) {
    throw new Error("Unable to build BasketFactory deployment calldata.");
  }

  const [gasEstimate, feeData, latestBlock, deployerBalance] = await Promise.all([
    provider.estimateGas({ from: deployerAddress, data: deployment.data }),
    provider.getFeeData(),
    provider.getBlock("latest"),
    provider.getBalance(deployerAddress),
  ]);
  const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? latestBlock?.baseFeePerGas;

  if (gasPrice === null || gasPrice === undefined) {
    throw new Error("Unable to determine a mainnet gas price from ROBINHOOD_MAINNET_RPC_URL.");
  }

  const gasWithMargin = (gasEstimate * BigInt(SAFETY_MARGIN_BPS)) / BASIS_POINTS;
  const cost = gasEstimate * gasPrice;
  const costWithMargin = gasWithMargin * gasPrice;
  const deficit = costWithMargin > deployerBalance
    ? costWithMargin - deployerBalance
    : 0n;

  console.log(`Network: Robinhood Chain mainnet (${PRODUCTION_CHAIN_ID})`);
  console.log(`Deployer ETH balance: ${formatEth(deployerBalance)} ETH`);
  console.log(`Official active Stock Token deployments: ${approvedTokens.length}`);
  console.log(`Estimated deployment gas: ${gasEstimate.toString()}`);
  console.log(`Safety-margin gas (+25%): ${gasWithMargin.toString()}`);
  console.log(`Current gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(
    `Latest base fee: ${latestBlock?.baseFeePerGas === null || latestBlock?.baseFeePerGas === undefined ? "unavailable" : `${ethers.formatUnits(latestBlock.baseFeePerGas, "gwei")} gwei`}`,
  );
  console.log(`Estimated deployment cost: ${formatEth(cost)} ETH`);
  console.log(`Estimated deployment cost (+25%): ${formatEth(costWithMargin)} ETH`);

  if (deficit > 0n) {
    console.log(`Balance check: INSUFFICIENT (deficit ${formatEth(deficit)} ETH)`);
    return;
  }

  console.log("Balance check: sufficient for the +25% estimate.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
