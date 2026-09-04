import hre from "hardhat";
import type { BaseContract, ContractTransactionReceipt, ContractTransactionResponse } from "ethers";

const { ethers, network } = hre;
const TESTNET_CHAIN_ID = 46630;
const BASKET_SIZES = [2, 5, 10] as const;
const MOCK_SUPPLY = ethers.parseUnits("1000000", 18);
const SHARE_AMOUNT = ethers.parseUnits("1", 18);

type GasRow = {
  assets: number;
  createGas: string;
  mintGas: string;
  redeemGas: string;
  vault: string;
};

type MockTokenContract = BaseContract & {
  mint(account: string, amount: bigint): Promise<ContractTransactionResponse>;
  approve(spender: string, amount: bigint): Promise<ContractTransactionResponse>;
};

function balancedWeights(size: number) {
  const baseWeight = Math.floor(10_000 / size);
  const weights = Array(size).fill(baseWeight) as number[];
  weights[0] += 10_000 - baseWeight * size;

  return weights;
}

async function waitForReceipt(tx: ContractTransactionResponse) {
  const receipt = (await tx.wait()) as ContractTransactionReceipt | null;

  if (!receipt) {
    throw new Error(`Transaction ${tx.hash} did not return a receipt.`);
  }

  return receipt;
}

async function tokenAddress(token: BaseContract) {
  return token.getAddress();
}

async function main() {
  if (network.config.chainId !== TESTNET_CHAIN_ID) {
    throw new Error(
      "This benchmark is testnet-only. Refusing to run outside Robinhood testnet 46630.",
    );
  }

  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error("DEPLOYER_PRIVATE_KEY is required for testnet gas benchmarking.");
  }

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const MockStockToken = await ethers.getContractFactory("MockStockToken");
  const tokens: MockTokenContract[] = [];

  for (let index = 0; index < Math.max(...BASKET_SIZES); index++) {
    const symbol = `MOCK${String(index + 1).padStart(2, "0")}`;
    const token = (await MockStockToken.deploy(
      `Mock Stock Token ${index + 1}`,
      symbol,
    )) as unknown as MockTokenContract;
    await token.waitForDeployment();
    await waitForReceipt(await token.mint(deployerAddress, MOCK_SUPPLY));
    tokens.push(token);
  }

  const Factory = await ethers.getContractFactory("BasketFactory");
  const factory = await Factory.deploy(await Promise.all(tokens.map(tokenAddress)));
  await factory.waitForDeployment();

  const rows: GasRow[] = [];

  for (const size of BASKET_SIZES) {
    const selectedTokens = tokens.slice(0, size);
    const selectedAddresses = await Promise.all(selectedTokens.map(tokenAddress));
    const createReceipt = await waitForReceipt(
      await factory.createBasket(
        `Gas Benchmark ${size}`,
        `GB${size}`,
        selectedAddresses,
        balancedWeights(size),
      ),
    );
    const baskets = (await factory.getBaskets()) as string[];
    const vaultAddress = baskets[baskets.length - 1];
    const vault = await ethers.getContractAt("BasketVault", vaultAddress);

    for (const token of selectedTokens) {
      await waitForReceipt(await token.approve(vaultAddress, ethers.MaxUint256));
    }

    const mintReceipt = await waitForReceipt(await vault.mint(SHARE_AMOUNT));
    const redeemReceipt = await waitForReceipt(await vault.redeem(SHARE_AMOUNT));

    rows.push({
      assets: size,
      createGas: createReceipt.gasUsed.toString(),
      mintGas: mintReceipt.gasUsed.toString(),
      redeemGas: redeemReceipt.gasUsed.toString(),
      vault: vaultAddress,
    });
  }

  console.log(`BasketFactory: ${await factory.getAddress()}`);
  console.table(rows);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
