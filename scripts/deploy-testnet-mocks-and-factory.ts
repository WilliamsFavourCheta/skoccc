import hre from "hardhat";

const { ethers, network } = hre;
const MOCK_SUPPLY = ethers.parseUnits("1000000", 18);
const TESTNET_CHAIN_ID = 46630;

const mockTokens = [
  ["Mock Apple Stock Token", "AAPL"],
  ["Mock NVIDIA Stock Token", "NVDA"],
  ["Mock Microsoft Stock Token", "MSFT"],
  ["Mock Alphabet Stock Token", "GOOGL"],
] as const;

async function main() {
  if (network.config.chainId !== TESTNET_CHAIN_ID) {
    throw new Error(
      "This script is testnet-only. Refusing to deploy mock tokens outside Robinhood testnet 46630.",
    );
  }

  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error("DEPLOYER_PRIVATE_KEY is required for testnet deployment.");
  }

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const MockStockToken = await ethers.getContractFactory("MockStockToken");
  const deployedTokens: Array<{
    symbol: string;
    name: string;
    contractAddress: string;
  }> = [];

  for (const [name, symbol] of mockTokens) {
    const token = await MockStockToken.deploy(name, symbol);
    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();
    await (await token.mint(deployerAddress, MOCK_SUPPLY)).wait();

    deployedTokens.push({ symbol, name, contractAddress: tokenAddress });

    console.log(`${symbol} mock deployed: ${tokenAddress}`);
    console.log(`${symbol} minted to deployer: ${ethers.formatUnits(MOCK_SUPPLY, 18)}`);
  }

  const Factory = await ethers.getContractFactory("BasketFactory");
  const factory = await Factory.deploy(
    deployedTokens.map((token) => token.contractAddress),
  );
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  const mockRegistry = deployedTokens.map((token) => ({
    id: `testnet-mock-${token.symbol.toLowerCase()}`,
    symbol: token.symbol,
    name: token.name,
    contractAddress: token.contractAddress,
    chainId: TESTNET_CHAIN_ID,
  }));

  console.log(`BasketFactory deployed: ${factoryAddress}`);
  console.log(`NEXT_PUBLIC_SKOCCC_TARGET_CHAIN_ID=${TESTNET_CHAIN_ID}`);
  console.log(`NEXT_PUBLIC_BASKET_FACTORY_ADDRESS_${TESTNET_CHAIN_ID}=${factoryAddress}`);
  console.log(
    `ROBINHOOD_TESTNET_MOCK_STOCK_TOKENS=${JSON.stringify(mockRegistry)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
