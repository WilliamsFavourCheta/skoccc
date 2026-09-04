import { expect } from "chai";
import hre from "hardhat";
import type { BaseContract, ContractTransactionResponse, Signer } from "ethers";

const { ethers } = hre;
const WEIGHTS = [4000, 3500, 2500];

type Contracts = {
  factory: BaseContract;
  vault: BaseContract;
  nvda: BaseContract;
  msft: BaseContract;
  googl: BaseContract;
};

async function tokenAddress(token: BaseContract) {
  return token.getAddress();
}

async function deployToken(name: string, symbol: string) {
  const Token = await ethers.getContractFactory("MockStockToken");
  const token = await Token.deploy(name, symbol);
  await token.waitForDeployment();
  return token;
}

async function deployFeeOnTransferToken(name: string, symbol: string, feeBps: number) {
  const Token = await ethers.getContractFactory("FeeOnTransferStockToken");
  const token = await Token.deploy(name, symbol, feeBps);
  await token.waitForDeployment();
  return token;
}

async function deployFalseReturnToken(name: string, symbol: string) {
  const Token = await ethers.getContractFactory("FalseReturnToken");
  const token = await Token.deploy(name, symbol);
  await token.waitForDeployment();
  return token;
}

function balancedWeights(size: number) {
  const baseWeight = Math.floor(10_000 / size);
  const weights = Array(size).fill(baseWeight) as number[];
  weights[0] += 10_000 - baseWeight * size;

  return weights;
}

async function deployManyTokens(count: number) {
  const tokens: BaseContract[] = [];

  for (let index = 0; index < count; index++) {
    tokens.push(
      await deployToken(
        `Mock Stock Token ${index + 1}`,
        `MOCK${String(index + 1).padStart(2, "0")}`,
      ),
    );
  }

  return tokens;
}

async function deployApprovedFactory(tokens: BaseContract[]) {
  const Factory = await ethers.getContractFactory("BasketFactory");
  const factory = await Factory.deploy(await Promise.all(tokens.map(tokenAddress)));
  await factory.waitForDeployment();
  return factory;
}

async function createVault(
  factory: BaseContract,
  tokens: BaseContract[],
  weights = WEIGHTS,
) {
  const tx = (await factory.createBasket(
    "AI Infrastructure",
    "AIX",
    await Promise.all(tokens.map(tokenAddress)),
    weights,
  )) as ContractTransactionResponse;
  await tx.wait();

  const baskets = (await factory.getBaskets()) as string[];
  return ethers.getContractAt("BasketVault", baskets[baskets.length - 1]);
}

async function approveAndMintTokens(
  contracts: Contracts,
  signer: Signer,
  amount = ethers.parseEther("1000"),
) {
  const vaultAddress = await contracts.vault.getAddress();

  for (const token of [contracts.nvda, contracts.msft, contracts.googl]) {
    await token.connect(signer).mint(await signer.getAddress(), amount);
    await token.connect(signer).approve(vaultAddress, amount);
  }
}

async function deployFixture(): Promise<Contracts> {
  const nvda = await deployToken("NVIDIA Stock Token", "NVDA");
  const msft = await deployToken("Microsoft Stock Token", "MSFT");
  const googl = await deployToken("Alphabet Stock Token", "GOOGL");
  const factory = await deployApprovedFactory([nvda, msft, googl]);
  const vault = await createVault(factory, [nvda, msft, googl]);

  return { factory, vault, nvda, msft, googl };
}

function redeemableAmount(shareAmount: bigint, weightBps: number) {
  return (shareAmount * BigInt(weightBps)) / BigInt(10_000);
}

async function expectFullyCollateralized(vault: BaseContract) {
  const totalSupply = (await vault.totalSupply()) as bigint;
  const [, weights] = (await vault.getComposition()) as [string[], bigint[]];
  const reserves = (await vault.getReserves()) as bigint[];

  for (let index = 0; index < reserves.length; index++) {
    expect(reserves[index]).to.be.greaterThanOrEqual(
      redeemableAmount(totalSupply, Number(weights[index])),
    );
  }
}

describe("BasketFactory and BasketVault", function () {
  it("creates immutable baskets with validated composition", async function () {
    const [creator] = await ethers.getSigners();
    const { factory, vault, nvda, msft, googl } = await deployFixture();

    expect(await factory.basketCount()).to.equal(1);
    expect(await vault.name()).to.equal("AI Infrastructure");
    expect(await vault.symbol()).to.equal("AIX");
    expect(await vault.creator()).to.equal(creator.address);
    expect(await vault.emergencyAdmin()).to.equal(await factory.getAddress());
    expect(await vault.totalSupply()).to.equal(0);
    expect(await nvda.decimals()).to.equal(18);
    expect(await factory.isBasket(await vault.getAddress())).to.equal(true);

    const [assets, weights] = await vault.getComposition();
    expect(assets).to.deep.equal([
      await nvda.getAddress(),
      await msft.getAddress(),
      await googl.getAddress(),
    ]);
    expect(weights).to.deep.equal(WEIGHTS.map(BigInt));
  });

  it("rejects invalid weights", async function () {
    const nvda = await deployToken("NVIDIA Stock Token", "NVDA");
    const msft = await deployToken("Microsoft Stock Token", "MSFT");
    const factory = await deployApprovedFactory([nvda, msft]);

    await expect(
      factory.createBasket(
        "Broken Basket",
        "BROKE",
        [await nvda.getAddress(), await msft.getAddress()],
        [5000, 4000],
      ),
    ).to.be.revertedWithCustomError(factory, "InvalidTotalWeight");
  });

  it("enforces case-insensitive ticker uniqueness while preserving basket addresses", async function () {
    const nvda = await deployToken("NVIDIA Stock Token", "NVDA");
    const msft = await deployToken("Microsoft Stock Token", "MSFT");
    const factory = await deployApprovedFactory([nvda, msft]);
    const assets = [await nvda.getAddress(), await msft.getAddress()];
    const weights = [5000, 5000];

    await expect(
      factory.createBasket("AI Infrastructure", "AIX", assets, weights),
    ).to.not.be.reverted;

    const firstBasket = await factory.getBasketByTicker("AIX");
    expect(firstBasket).to.not.equal(ethers.ZeroAddress);
    expect(await factory.getBasketByTicker("aix")).to.equal(firstBasket);

    await expect(
      factory.createBasket("Duplicate Exact", "AIX", assets, weights),
    )
      .to.be.revertedWithCustomError(factory, "TickerAlreadyUsed")
      .withArgs("AIX", firstBasket);

    await expect(
      factory.createBasket("Duplicate Mixed Case", "AiX", assets, weights),
    )
      .to.be.revertedWithCustomError(factory, "TickerAlreadyUsed")
      .withArgs("AiX", firstBasket);

    await expect(
      factory.createBasket("Different Basket", "NEXT", assets, weights),
    ).to.not.be.reverted;
    expect(await factory.basketCount()).to.equal(2);
    expect(await factory.getBasketByTicker("next")).to.not.equal(firstBasket);
  });

  it("accepts 10-asset baskets for V1", async function () {
    const tokens = await deployManyTokens(10);
    const factory = await deployApprovedFactory(tokens);
    const vault = await createVault(factory, tokens, balancedWeights(10));

    expect(await factory.basketCount()).to.equal(1);
    expect(await vault.underlyingAssetCount()).to.equal(10);
  });

  it("rejects 11-asset baskets for V1", async function () {
    const tokens = await deployManyTokens(11);
    const factory = await deployApprovedFactory(tokens);

    await expect(
      factory.createBasket(
        "Too Many Assets",
        "MAX11",
        await Promise.all(tokens.map(tokenAddress)),
        balancedWeights(11),
      ),
    ).to.be.revertedWithCustomError(factory, "TooManyAssets");
  });

  it("lets the factory owner pause and unpause creation of new baskets", async function () {
    const nvda = await deployToken("NVIDIA Stock Token", "NVDA");
    const msft = await deployToken("Microsoft Stock Token", "MSFT");
    const factory = await deployApprovedFactory([nvda, msft]);

    await factory.pauseCreation();
    expect(await factory.paused()).to.equal(true);

    await expect(
      factory.createBasket(
        "Paused Basket",
        "PAUSE",
        [await nvda.getAddress(), await msft.getAddress()],
        [5000, 5000],
      ),
    ).to.be.revertedWithCustomError(factory, "EnforcedPause");

    await factory.unpauseCreation();
    expect(await factory.paused()).to.equal(false);

    await createVault(factory, [nvda, msft], [5000, 5000]);
    expect(await factory.basketCount()).to.equal(1);
  });

  it("prevents non-owners from pausing creation or basket minting", async function () {
    const [, user] = await ethers.getSigners();
    const contracts = await deployFixture();

    await expect(
      contracts.factory.connect(user).pauseCreation(),
    ).to.be.revertedWithCustomError(contracts.factory, "OwnableUnauthorizedAccount");

    await expect(
      contracts.factory.connect(user).setBasketMintingPaused(
        await contracts.vault.getAddress(),
        true,
      ),
    ).to.be.revertedWithCustomError(contracts.factory, "OwnableUnauthorizedAccount");

    await expect(
      contracts.vault.setMintingPaused(true),
    ).to.be.revertedWithCustomError(contracts.vault, "UnauthorizedEmergencyAdmin");
  });

  it("lets the factory owner pause individual basket minting while preserving redemption", async function () {
    const [owner, user] = await ethers.getSigners();
    const contracts = await deployFixture();

    await approveAndMintTokens(contracts, owner);
    await approveAndMintTokens(contracts, user);
    await contracts.vault.mint(ethers.parseEther("10"));

    await expect(
      contracts.factory.setBasketMintingPaused(await contracts.vault.getAddress(), true),
    )
      .to.emit(contracts.vault, "BasketMintingPauseChanged")
      .withArgs(true);
    expect(await contracts.vault.mintingPaused()).to.equal(true);

    await expect(
      contracts.vault.connect(user).mint(ethers.parseEther("1")),
    ).to.be.revertedWithCustomError(contracts.vault, "MintingPaused");

    await expect(
      contracts.vault.redeem(ethers.parseEther("1")),
    )
      .to.emit(contracts.vault, "BasketRedeemed")
      .withArgs(owner.address, ethers.parseEther("1"));
    expect(await contracts.vault.balanceOf(owner.address)).to.equal(
      ethers.parseEther("9"),
    );

    await contracts.factory.setBasketMintingPaused(await contracts.vault.getAddress(), false);
    await contracts.vault.connect(user).mint(ethers.parseEther("1"));
    expect(await contracts.vault.balanceOf(user.address)).to.equal(
      ethers.parseEther("1"),
    );
  });

  it("rejects mint pause changes for vaults not created by the factory", async function () {
    const contracts = await deployFixture();

    await expect(
      contracts.factory.setBasketMintingPaused(await contracts.nvda.getAddress(), true),
    )
      .to.be.revertedWithCustomError(contracts.factory, "UnknownBasket")
      .withArgs(await contracts.nvda.getAddress());
  });

  it("rejects empty names, empty symbols, empty assets, duplicate assets, zero addresses, and zero weights", async function () {
    const nvda = await deployToken("NVIDIA Stock Token", "NVDA");
    const msft = await deployToken("Microsoft Stock Token", "MSFT");
    const factory = await deployApprovedFactory([nvda, msft]);
    const nvdaAddress = await nvda.getAddress();
    const msftAddress = await msft.getAddress();

    await expect(
      factory.createBasket("", "EMPTY", [nvdaAddress], [10000]),
    ).to.be.revertedWithCustomError(factory, "EmptyName");

    await expect(
      factory.createBasket("Empty Symbol", "", [nvdaAddress], [10000]),
    ).to.be.revertedWithCustomError(factory, "EmptySymbol");

    await expect(
      factory.createBasket("Empty Assets", "EMPTY", [], []),
    ).to.be.revertedWithCustomError(factory, "EmptyAssets");

    await expect(
      factory.setApprovedStockToken(ethers.ZeroAddress, true),
    ).to.be.revertedWithCustomError(factory, "UnapprovedStockToken");

    await expect(
      factory.createBasket("Duplicate Basket", "DUP", [nvdaAddress, nvdaAddress], [5000, 5000]),
    ).to.be.revertedWithCustomError(factory, "DuplicateAsset");

    await expect(
      factory.createBasket("Zero Weight Basket", "ZERO", [nvdaAddress, msftAddress], [10000, 0]),
    ).to.be.revertedWithCustomError(factory, "InvalidWeight");
  });

  it("mints basket shares after receiving proportional underlying tokens", async function () {
    const [owner] = await ethers.getSigners();
    const contracts = await deployFixture();

    await approveAndMintTokens(contracts, owner);
    await expect(contracts.vault.mint(ethers.parseEther("100")))
      .to.emit(contracts.vault, "BasketMinted")
      .withArgs(owner.address, ethers.parseEther("100"));

    expect(await contracts.vault.balanceOf(owner.address)).to.equal(
      ethers.parseEther("100"),
    );
  });

  it("supports partial minting", async function () {
    const [owner] = await ethers.getSigners();
    const contracts = await deployFixture();

    await approveAndMintTokens(contracts, owner);
    await contracts.vault.mint(ethers.parseEther("0.5"));

    expect(await contracts.vault.balanceOf(owner.address)).to.equal(
      ethers.parseEther("0.5"),
    );
  });

  it("rejects zero-value minting and redeeming", async function () {
    const contracts = await deployFixture();

    await expect(
      contracts.vault.mint(0),
    ).to.be.revertedWithCustomError(contracts.vault, "InvalidAmount");

    await expect(
      contracts.vault.redeem(0),
    ).to.be.revertedWithCustomError(contracts.vault, "InvalidAmount");
  });

  it("rejects fee-on-transfer underlyings before minting undercollateralized shares", async function () {
    const [owner] = await ethers.getSigners();
    const feeToken = await deployFeeOnTransferToken("Fee Stock Token", "FEE", 100);
    const factory = await deployApprovedFactory([feeToken]);
    const vault = await createVault(factory, [feeToken], [10000]);
    const vaultAddress = await vault.getAddress();
    const shareAmount = ethers.parseEther("100");

    await feeToken.mint(owner.address, shareAmount);
    await feeToken.approve(vaultAddress, shareAmount);

    await expect(vault.mint(shareAmount))
      .to.be.revertedWithCustomError(vault, "InsufficientUnderlyingReceived")
      .withArgs(await feeToken.getAddress(), shareAmount, ethers.parseEther("99"));

    expect(await vault.totalSupply()).to.equal(0);
    expect(await feeToken.balanceOf(vaultAddress)).to.equal(0);
  });

  it("rejects tokens that return false from transferFrom", async function () {
    const [owner] = await ethers.getSigners();
    const falseToken = await deployFalseReturnToken("False Return Token", "FALSE");
    const factory = await deployApprovedFactory([falseToken]);
    const vault = await createVault(factory, [falseToken], [10000]);
    const vaultAddress = await vault.getAddress();
    const shareAmount = ethers.parseEther("1");

    await falseToken.mint(owner.address, shareAmount);
    await falseToken.approve(vaultAddress, shareAmount);

    await expect(vault.mint(shareAmount)).to.be.reverted;
    expect(await vault.totalSupply()).to.equal(0);
    expect(await falseToken.balanceOf(vaultAddress)).to.equal(0);
  });

  it("redeems basket shares for proportional underlying tokens", async function () {
    const [owner] = await ethers.getSigners();
    const contracts = await deployFixture();

    await approveAndMintTokens(contracts, owner);
    await contracts.vault.mint(ethers.parseEther("100"));

    await expect(contracts.vault.redeem(ethers.parseEther("100")))
      .to.emit(contracts.vault, "BasketRedeemed")
      .withArgs(owner.address, ethers.parseEther("100"));

    expect(await contracts.vault.balanceOf(owner.address)).to.equal(0);
    expect(await contracts.nvda.balanceOf(await contracts.vault.getAddress())).to.equal(0);
    expect(await contracts.msft.balanceOf(await contracts.vault.getAddress())).to.equal(0);
    expect(await contracts.googl.balanceOf(await contracts.vault.getAddress())).to.equal(0);
  });

  it("supports partial redemption", async function () {
    const [owner] = await ethers.getSigners();
    const contracts = await deployFixture();

    await approveAndMintTokens(contracts, owner);
    await contracts.vault.mint(ethers.parseEther("100"));
    await contracts.vault.redeem(ethers.parseEther("25"));

    expect(await contracts.vault.balanceOf(owner.address)).to.equal(
      ethers.parseEther("75"),
    );
    expect(await contracts.nvda.balanceOf(await contracts.vault.getAddress())).to.equal(
      ethers.parseEther("30"),
    );
  });

  it("rejects minting with insufficient token balance", async function () {
    const [owner] = await ethers.getSigners();
    const contracts = await deployFixture();
    const vaultAddress = await contracts.vault.getAddress();

    await contracts.nvda.mint(owner.address, ethers.parseEther("1000"));
    await contracts.msft.mint(owner.address, ethers.parseEther("1"));
    await contracts.googl.mint(owner.address, ethers.parseEther("1000"));

    for (const token of [contracts.nvda, contracts.msft, contracts.googl]) {
      await token.approve(vaultAddress, ethers.parseEther("1000"));
    }

    await expect(contracts.vault.mint(ethers.parseEther("100"))).to.be.reverted;
  });

  it("rejects minting when approvals are missing", async function () {
    const [owner] = await ethers.getSigners();
    const contracts = await deployFixture();

    for (const token of [contracts.nvda, contracts.msft, contracts.googl]) {
      await token.mint(owner.address, ethers.parseEther("1000"));
    }

    await expect(contracts.vault.mint(ethers.parseEther("100"))).to.be.reverted;
  });

  it("tracks reserve accounting", async function () {
    const [owner] = await ethers.getSigners();
    const contracts = await deployFixture();

    await approveAndMintTokens(contracts, owner);
    await contracts.vault.mint(ethers.parseEther("100"));

    expect(await contracts.vault.getReserves()).to.deep.equal([
      ethers.parseEther("40"),
      ethers.parseEther("35"),
      ethers.parseEther("25"),
    ]);
    await expectFullyCollateralized(contracts.vault);
  });

  it("supports multiple users", async function () {
    const [owner, user] = await ethers.getSigners();
    const contracts = await deployFixture();

    await approveAndMintTokens(contracts, owner);
    await approveAndMintTokens(contracts, user);

    await contracts.vault.connect(owner).mint(ethers.parseEther("100"));
    await contracts.vault.connect(user).mint(ethers.parseEther("25"));

    expect(await contracts.vault.balanceOf(owner.address)).to.equal(
      ethers.parseEther("100"),
    );
    expect(await contracts.vault.balanceOf(user.address)).to.equal(
      ethers.parseEther("25"),
    );
    expect(await contracts.vault.totalSupply()).to.equal(ethers.parseEther("125"));
    await expectFullyCollateralized(contracts.vault);
  });

  it("transfers basket tokens between users", async function () {
    const [owner, user] = await ethers.getSigners();
    const contracts = await deployFixture();

    await approveAndMintTokens(contracts, owner);
    await contracts.vault.mint(ethers.parseEther("100"));
    await contracts.vault.transfer(user.address, ethers.parseEther("10"));

    expect(await contracts.vault.balanceOf(user.address)).to.equal(
      ethers.parseEther("10"),
    );
    expect(await contracts.vault.balanceOf(owner.address)).to.equal(
      ethers.parseEther("90"),
    );
    await contracts.vault.connect(user).redeem(ethers.parseEther("10"));
    expect(await contracts.vault.balanceOf(user.address)).to.equal(0);
    await expectFullyCollateralized(contracts.vault);
  });

  it("preserves collateralization across mixed mint, transfer, partial redemption, and full redemption sequences", async function () {
    const [owner, user, thirdUser] = await ethers.getSigners();
    const contracts = await deployFixture();

    await approveAndMintTokens(contracts, owner);
    await approveAndMintTokens(contracts, user);
    await approveAndMintTokens(contracts, thirdUser);

    await contracts.vault.connect(owner).mint(ethers.parseEther("100"));
    await expectFullyCollateralized(contracts.vault);

    await contracts.vault.connect(user).mint(ethers.parseEther("33.333333333333333333"));
    await expectFullyCollateralized(contracts.vault);

    await contracts.vault.connect(thirdUser).mint(1);
    await expectFullyCollateralized(contracts.vault);

    await contracts.vault.connect(owner).transfer(user.address, ethers.parseEther("0.25"));
    await contracts.vault.connect(user).redeem(ethers.parseEther("0.10"));
    await expectFullyCollateralized(contracts.vault);

    await contracts.vault.connect(owner).redeem(ethers.parseEther("99.75"));
    await expectFullyCollateralized(contracts.vault);

    await contracts.vault.connect(user).redeem(
      await contracts.vault.balanceOf(user.address),
    );
    await contracts.vault.connect(thirdUser).redeem(
      await contracts.vault.balanceOf(thirdUser.address),
    );

    expect(await contracts.vault.totalSupply()).to.equal(0);
    await expectFullyCollateralized(contracts.vault);
  });

  it("keeps accidental direct token transfers as surplus reserves without undercollateralizing shares", async function () {
    const [owner] = await ethers.getSigners();
    const contracts = await deployFixture();
    const vaultAddress = await contracts.vault.getAddress();

    await approveAndMintTokens(contracts, owner);
    await contracts.vault.mint(ethers.parseEther("10"));
    await contracts.nvda.transfer(vaultAddress, ethers.parseEther("1"));

    expect(await contracts.nvda.balanceOf(vaultAddress)).to.equal(
      ethers.parseEther("5"),
    );
    await expectFullyCollateralized(contracts.vault);

    await contracts.vault.redeem(ethers.parseEther("10"));
    expect(await contracts.vault.totalSupply()).to.equal(0);
    expect(await contracts.nvda.balanceOf(vaultAddress)).to.equal(
      ethers.parseEther("1"),
    );
  });

  it("rejects baskets containing unapproved tokens", async function () {
    const nvda = await deployToken("NVIDIA Stock Token", "NVDA");
    const msft = await deployToken("Microsoft Stock Token", "MSFT");
    const factory = await deployApprovedFactory([nvda]);

    await expect(
      factory.createBasket(
        "Unapproved Basket",
        "NOPE",
        [await nvda.getAddress(), await msft.getAddress()],
        [5000, 5000],
      ),
    ).to.be.revertedWithCustomError(factory, "UnapprovedStockToken");
  });
});
