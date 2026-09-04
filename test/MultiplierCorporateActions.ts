import { expect } from "chai";
import hre from "hardhat";
import type { BaseContract, ContractTransactionResponse, Signer } from "ethers";

const { ethers } = hre;
const WEIGHTS_50_50 = [5000, 5000];
const MULTIPLIER_SCALE = ethers.parseUnits("1", 18);
const FORWARD_SPLIT_MULTIPLIER = ethers.parseUnits("4", 18);
const REVERSE_SPLIT_MULTIPLIER = ethers.parseUnits("0.25", 18);

async function tokenAddress(token: BaseContract) {
  return token.getAddress();
}

async function deployMultiplierToken(name: string, symbol: string) {
  const Token = await ethers.getContractFactory("MultiplierStockToken");
  const token = await Token.deploy(name, symbol);
  await token.waitForDeployment();
  return token;
}

async function deployVault(tokens: BaseContract[], weights: number[]) {
  const Factory = await ethers.getContractFactory("BasketFactory");
  const factory = await Factory.deploy(await Promise.all(tokens.map(tokenAddress)));
  await factory.waitForDeployment();

  const tx = (await factory.createBasket(
    "Multiplier Basket",
    "MULTI",
    await Promise.all(tokens.map(tokenAddress)),
    weights,
  )) as ContractTransactionResponse;
  await tx.wait();

  const baskets = (await factory.getBaskets()) as string[];
  const vault = await ethers.getContractAt("BasketVault", baskets[0]);

  return { factory, vault };
}

async function mintAndApprove(
  token: BaseContract,
  signer: Signer,
  spender: string,
  amount = ethers.parseEther("1000"),
) {
  await token.connect(signer).mint(await signer.getAddress(), amount);
  await token.connect(signer).approve(spender, amount);
}

function rawToUiAmount(rawAmount: bigint, multiplier: bigint) {
  return (rawAmount * multiplier) / MULTIPLIER_SCALE;
}

function proportionalRawClaim(shareAmount: bigint, weightBps: number) {
  return (shareAmount * BigInt(weightBps)) / BigInt(10_000);
}

async function expectFullyCollateralized(vault: BaseContract) {
  const totalSupply = (await vault.totalSupply()) as bigint;
  const [, weights] = (await vault.getComposition()) as [string[], bigint[]];
  const reserves = (await vault.getReserves()) as bigint[];

  for (let index = 0; index < reserves.length; index++) {
    expect(reserves[index]).to.be.greaterThanOrEqual(
      proportionalRawClaim(totalSupply, Number(weights[index])),
    );
  }
}

describe("BasketVault ERC-8056 multiplier compatibility", function () {
  it("preserves raw collateralization and redemption claims after a forward-split multiplier increase", async function () {
    const [holder] = await ethers.getSigners();
    const aapl = await deployMultiplierToken("Multiplier Apple Stock Token", "AAPL");
    const { vault } = await deployVault([aapl], [10000]);
    const vaultAddress = await vault.getAddress();
    const shareAmount = ethers.parseEther("100");
    const partialRedeem = ethers.parseEther("25");

    await mintAndApprove(aapl, holder, vaultAddress);
    expect(await aapl.uiMultiplier()).to.equal(MULTIPLIER_SCALE);

    await vault.mint(shareAmount);
    expect(await aapl.balanceOf(vaultAddress)).to.equal(shareAmount);
    expect(await vault.totalSupply()).to.equal(shareAmount);

    await aapl.setUIMultiplier(FORWARD_SPLIT_MULTIPLIER);
    expect(await aapl.uiMultiplier()).to.equal(FORWARD_SPLIT_MULTIPLIER);
    expect(await aapl.balanceOf(vaultAddress)).to.equal(shareAmount);
    expect(await vault.totalSupply()).to.equal(shareAmount);
    await expectFullyCollateralized(vault);

    const balanceBeforePartialRedeem = (await aapl.balanceOf(holder.address)) as bigint;
    await vault.redeem(partialRedeem);
    const balanceAfterPartialRedeem = (await aapl.balanceOf(holder.address)) as bigint;

    expect(balanceAfterPartialRedeem - balanceBeforePartialRedeem).to.equal(
      partialRedeem,
    );
    expect(rawToUiAmount(partialRedeem, FORWARD_SPLIT_MULTIPLIER)).to.equal(
      ethers.parseEther("100"),
    );
    await expectFullyCollateralized(vault);

    await vault.redeem(await vault.balanceOf(holder.address));
    expect(await vault.totalSupply()).to.equal(0);
    expect(await aapl.balanceOf(vaultAddress)).to.equal(0);
  });

  it("preserves raw collateralization and redemption claims after a reverse-split multiplier decrease", async function () {
    const [holder] = await ethers.getSigners();
    const aapl = await deployMultiplierToken("Multiplier Apple Stock Token", "AAPL");
    const { vault } = await deployVault([aapl], [10000]);
    const vaultAddress = await vault.getAddress();
    const shareAmount = ethers.parseEther("100");
    const partialRedeem = ethers.parseEther("40");

    await mintAndApprove(aapl, holder, vaultAddress);
    await vault.mint(shareAmount);

    await aapl.setUIMultiplier(REVERSE_SPLIT_MULTIPLIER);
    expect(await aapl.uiMultiplier()).to.equal(REVERSE_SPLIT_MULTIPLIER);
    expect(await aapl.balanceOf(vaultAddress)).to.equal(shareAmount);
    expect(await vault.totalSupply()).to.equal(shareAmount);
    await expectFullyCollateralized(vault);

    const balanceBeforePartialRedeem = (await aapl.balanceOf(holder.address)) as bigint;
    await vault.redeem(partialRedeem);
    const balanceAfterPartialRedeem = (await aapl.balanceOf(holder.address)) as bigint;

    expect(balanceAfterPartialRedeem - balanceBeforePartialRedeem).to.equal(
      partialRedeem,
    );
    expect(rawToUiAmount(partialRedeem, REVERSE_SPLIT_MULTIPLIER)).to.equal(
      ethers.parseEther("10"),
    );
    await expectFullyCollateralized(vault);

    await vault.redeem(await vault.balanceOf(holder.address));
    expect(await vault.totalSupply()).to.equal(0);
    expect(await aapl.balanceOf(vaultAddress)).to.equal(0);
  });

  it("does not give post-multiplier minters a larger proportional raw claim than existing holders", async function () {
    const [oldHolder, newHolder] = await ethers.getSigners();
    const aapl = await deployMultiplierToken("Multiplier Apple Stock Token", "AAPL");
    const msft = await deployMultiplierToken("Multiplier Microsoft Stock Token", "MSFT");
    const { vault } = await deployVault([aapl, msft], WEIGHTS_50_50);
    const vaultAddress = await vault.getAddress();
    const shareAmount = ethers.parseEther("100");
    const expectedRawClaimPerHolder = ethers.parseEther("50");

    await mintAndApprove(aapl, oldHolder, vaultAddress);
    await mintAndApprove(msft, oldHolder, vaultAddress);
    await mintAndApprove(aapl, newHolder, vaultAddress);
    await mintAndApprove(msft, newHolder, vaultAddress);

    await vault.connect(oldHolder).mint(shareAmount);
    await aapl.setUIMultiplier(FORWARD_SPLIT_MULTIPLIER);
    await vault.connect(newHolder).mint(shareAmount);

    expect(await vault.totalSupply()).to.equal(ethers.parseEther("200"));
    expect(await aapl.balanceOf(vaultAddress)).to.equal(ethers.parseEther("100"));
    expect(await msft.balanceOf(vaultAddress)).to.equal(ethers.parseEther("100"));
    expect(rawToUiAmount(expectedRawClaimPerHolder, FORWARD_SPLIT_MULTIPLIER)).to.equal(
      ethers.parseEther("200"),
    );
    await expectFullyCollateralized(vault);

    const oldAaplBefore = (await aapl.balanceOf(oldHolder.address)) as bigint;
    const oldMsftBefore = (await msft.balanceOf(oldHolder.address)) as bigint;
    await vault.connect(oldHolder).redeem(shareAmount);
    expect((await aapl.balanceOf(oldHolder.address)) - oldAaplBefore).to.equal(
      expectedRawClaimPerHolder,
    );
    expect((await msft.balanceOf(oldHolder.address)) - oldMsftBefore).to.equal(
      expectedRawClaimPerHolder,
    );

    const newAaplBefore = (await aapl.balanceOf(newHolder.address)) as bigint;
    const newMsftBefore = (await msft.balanceOf(newHolder.address)) as bigint;
    await vault.connect(newHolder).redeem(shareAmount);
    expect((await aapl.balanceOf(newHolder.address)) - newAaplBefore).to.equal(
      expectedRawClaimPerHolder,
    );
    expect((await msft.balanceOf(newHolder.address)) - newMsftBefore).to.equal(
      expectedRawClaimPerHolder,
    );
    expect(await vault.totalSupply()).to.equal(0);
    expect(await aapl.balanceOf(vaultAddress)).to.equal(0);
    expect(await msft.balanceOf(vaultAddress)).to.equal(0);
  });
});
