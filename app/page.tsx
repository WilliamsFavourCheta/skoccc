"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatUnits, type Address } from "viem";
import { useBlockNumber, useReadContract, useReadContracts } from "wagmi";
import {
  CompositionBar,
  Footer,
  Header,
  IconActivity,
  IconArrowDown,
  IconArrowRight,
  IconBox,
  MarketTape,
  MetricCard,
} from "./components";
import type { AssetWeight } from "./data";
import { basketFactoryAbi, basketVaultAbi } from "./contracts/abis";
import {
  getBasketFactoryAddress,
  getMissingFactoryMessage,
} from "./contracts/addresses";
import { useOfficialStockTokens } from "./hooks/use-stock-tokens";
import { targetChain } from "./web3/chains";
import { formatAddress, getErrorText } from "./web3/format";

const mechanism = [
  {
    number: "01",
    title: "COMPOSE",
    copy: "Select the assets that express your conviction. Set the weights. Publish the thesis.",
    Icon: IconBox,
  },
  {
    number: "02",
    title: "MINT",
    copy: "Deposit the underlying tokens into a fully transparent vault and mint your basket.",
    Icon: IconActivity,
  },
  {
    number: "03",
    title: "REDEEM",
    copy: "Burn one basket token to withdraw its proportional share. No permission required.",
    Icon: IconArrowDown,
  },
];

const ZERO = BigInt(0);

type HomeBasket = {
  address: Address;
  name: string;
  symbol: string;
  totalSupply: bigint;
  mintingPaused: boolean;
  assets: Address[];
  weights: number[];
};

function readResult<T>(
  reads: readonly { result?: unknown }[] | undefined,
  index: number,
  fallback: T,
) {
  return (reads?.[index]?.result as T | undefined) ?? fallback;
}

function formatTokenAmount(value: bigint, maximumFractionDigits = 4) {
  return Number(formatUnits(value, 18)).toLocaleString("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
}

export default function Home() {
  const factoryAddress = getBasketFactoryAddress();
  const stockTokens = useOfficialStockTokens(targetChain.id, {
    includePrices: true,
  });
  const factoryBaskets = useReadContract({
    address: factoryAddress ?? undefined,
    abi: basketFactoryAbi,
    functionName: "getBaskets",
    query: {
      enabled: Boolean(factoryAddress),
      refetchInterval: 15_000,
    },
  });
  const basketAddresses = useMemo(
    () => [...(factoryBaskets.data ?? [])] as Address[],
    [factoryBaskets.data],
  );
  const basketReads = useReadContracts({
    contracts: basketAddresses.flatMap((address) => [
      { address, abi: basketVaultAbi, functionName: "name" as const },
      { address, abi: basketVaultAbi, functionName: "symbol" as const },
      { address, abi: basketVaultAbi, functionName: "totalSupply" as const },
      { address, abi: basketVaultAbi, functionName: "mintingPaused" as const },
      { address, abi: basketVaultAbi, functionName: "getComposition" as const },
    ]),
    query: {
      enabled: basketAddresses.length > 0,
      refetchInterval: 15_000,
    },
  });
  const blockNumber = useBlockNumber({
    chainId: targetChain.id,
    query: { refetchInterval: 15_000 },
  });
  const tokenMetadata = useMemo(
    () =>
      new Map(
        stockTokens.data.map((token) => [
          token.contractAddress.toLowerCase(),
          token,
        ]),
      ),
    [stockTokens.data],
  );
  const baskets = useMemo(() => {
    const reads = basketReads.data;

    return basketAddresses.map((address, index) => {
      const offset = index * 5;
      const composition = readResult<readonly [readonly Address[], readonly number[]]>(
        reads,
        offset + 4,
        [[], []],
      );

      return {
        address,
        name: readResult(reads, offset, "Unnamed basket"),
        symbol: readResult(reads, offset + 1, "BASKET"),
        totalSupply: readResult(reads, offset + 2, ZERO),
        mintingPaused: readResult(reads, offset + 3, false),
        assets: [...composition[0]],
        weights: composition[1].map(Number),
      } satisfies HomeBasket;
    });
  }, [basketAddresses, basketReads.data]);
  const featuredBasket = baskets.at(-1);
  const featuredAssets = useMemo<AssetWeight[]>(
    () =>
      (featuredBasket?.assets ?? []).map((asset, index) => ({
        symbol:
          tokenMetadata.get(asset.toLowerCase())?.symbol ?? formatAddress(asset),
        weight: (featuredBasket?.weights[index] ?? 0) / 100,
      })),
    [featuredBasket, tokenMetadata],
  );
  const tapeItems = useMemo(
    () =>
      stockTokens.data.map((token) => ({
        symbol: token.symbol,
        price:
          token.priceUsd === null
            ? null
            : token.priceUsd.toLocaleString("en-US", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              }),
        status: targetChain.testnet ? "TESTNET" : "LIVE",
      })),
    [stockTokens.data],
  );
  const readError = getErrorText(factoryBaskets.error ?? basketReads.error);
  const loadingBaskets =
    factoryBaskets.isLoading ||
    factoryBaskets.isFetching ||
    basketReads.isLoading ||
    basketReads.isFetching;
  const mintableBaskets = baskets.filter((basket) => !basket.mintingPaused).length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080A0C] text-[#F1F1EA]">
      <div className="technical-grid" aria-hidden="true" />
      <Header activePath="/" />
      <main className="relative z-10">
        <section className="reveal-on-scroll border-b border-[#20252C] px-6 pb-0 pt-20 sm:pt-28 lg:px-12 lg:pt-36">
          <div className="mx-auto max-w-7xl">
            <div className="mono-label mb-10 flex items-center justify-between text-[#7B828C]">
              <span>PROTOCOL / 001</span>
              <span className="hidden sm:inline">
                ASSET COMPOSITION ENGINE / ONLINE
              </span>
              <span className="flex items-center">
                SCROLL TO EXPLORE{" "}
                <IconArrowDown className="ml-1 inline h-3 w-3 text-[#397BFF]" />
              </span>
            </div>
            <div className="relative flex min-h-[390px] items-center border-y border-[#20252C] py-20 sm:min-h-[480px] lg:min-h-[560px]">
              <div
                className="pointer-events-none absolute left-[-10%] right-[-10%] top-1/2 h-px rotate-[-9deg] bg-[#397BFF]"
                aria-hidden="true"
              />
              <div className="relative z-10 w-full">
                <p className="mono-label mb-5 text-[#397BFF]">
                  THE MARKET IS A MEDIUM
                </p>
                <h1 className="max-w-6xl text-[clamp(4.7rem,16vw,14rem)] font-black leading-[0.78] tracking-[-0.09em] text-[#F1F1EA]">
                  SKO<span className="text-[#397BFF]">CCC</span>
                </h1>
                <div className="mt-12 flex flex-col justify-between gap-8 border-t border-[#20252C] pt-6 sm:flex-row">
                  <p className="max-w-2xl text-xl font-bold uppercase leading-tight tracking-[-0.04em] sm:text-3xl">
                    BUILD THE BASKET.
                    <br />
                    TRADE THE THESIS.
                    <br />
                    REDEEM THE STOCKS.
                  </p>
                  <p className="mono-label max-w-xs leading-relaxed text-[#7B828C]">
                    A permissionless protocol for turning a point of view into
                    a liquid, composable asset.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {stockTokens.loading ? (
          <div className="border-y border-[#20252C] px-6 py-3 font-mono text-xs text-[#7B828C]">
            LOADING APPROVED STOCK TOKENS...
          </div>
        ) : stockTokens.error ? (
          <div className="border-y border-[#FF5555]/50 px-6 py-3 font-mono text-xs text-[#FF5555]">
            TOKEN REGISTRY UNAVAILABLE: {stockTokens.error}
          </div>
        ) : tapeItems.length > 0 ? (
          <MarketTape items={tapeItems} />
        ) : (
          <div className="border-y border-[#20252C] px-6 py-3 font-mono text-xs text-[#7B828C]">
            NO APPROVED STOCK TOKENS CONFIGURED FOR {targetChain.name.toUpperCase()}.
          </div>
        )}

        <section className="reveal-on-scroll mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-36">
          <div className="mb-14 flex items-start justify-between border-b border-[#20252C] pb-6">
            <div>
              <span className="mono-label text-[#397BFF]">SECTION 01</span>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                ONE TOKEN.
                <br />
                AN ENTIRE THESIS.
              </h2>
            </div>
            <span className="mono-label hidden text-[#7B828C] sm:block">
              COMPOSABLE / TRANSPARENT / LIQUID
            </span>
          </div>
          <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-24">
            <div className="flex flex-col justify-between gap-12">
              <div>
                <p className="max-w-lg text-2xl font-medium leading-tight text-[#F1F1EA]">
                  The vault does the boring work. You bring the insight.
                </p>
                <p className="mt-6 max-w-md leading-relaxed text-[#7B828C]">
                  SKOCCC baskets package multiple assets into a single on-chain
                  token. Every token is backed 1:1 by the underlying
                  composition, held in a verifiable vault.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6 border-t border-[#20252C] pt-6">
                <div>
                  <p className="mono-label">01 / BACKED</p>
                  <p className="mt-2 font-mono text-lg">1:1 COLLATERAL</p>
                </div>
                <div>
                  <p className="mono-label">02 / ACCESS</p>
                  <p className="mt-2 font-mono text-lg">24 / 7 / GLOBAL</p>
                </div>
              </div>
            </div>
            <article className="alive-ring border border-[#20252C] bg-[#101418] p-6 sm:p-8">
              <div className="flex items-start justify-between border-b border-[#20252C] pb-6">
                <div>
                  <p className="mono-label text-[#397BFF]">LATEST FACTORY BASKET</p>
                  <h3 className="mt-2 text-4xl font-black tracking-[-0.06em]">
                    {loadingBaskets ? "LOADING" : featuredBasket ? `$${featuredBasket.symbol}` : "NO BASKET"}
                  </h3>
                  <p className="mono-label mt-1">
                    {loadingBaskets
                      ? "READING ROBINHOOD CHAIN"
                      : featuredBasket?.name ?? "CREATE THE FIRST BASKET"}
                  </p>
                </div>
                <span
                  className={`mono-label border px-2 py-1 ${
                    featuredBasket?.mintingPaused
                      ? "border-[#FF5555]/60 !text-[#FF5555]"
                      : "border-[#397BFF] !text-[#397BFF]"
                  }`}
                >
                  {featuredBasket?.mintingPaused ? "MINT PAUSED" : "MINTABLE"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-8 py-8">
                <div>
                  <p className="mono-label">TOTAL SUPPLY</p>
                  <p className="financial-value mt-2 text-3xl">
                    {featuredBasket ? formatTokenAmount(featuredBasket.totalSupply) : "--"}
                  </p>
                </div>
                <div>
                  <p className="mono-label">UNDERLYING ASSETS</p>
                  <p className="financial-value mt-2 text-3xl text-[#397BFF]">
                    {featuredBasket ? featuredBasket.assets.length.toString().padStart(2, "0") : "--"}
                  </p>
                </div>
              </div>
              {featuredAssets.length > 0 ? (
                <CompositionBar assets={featuredAssets} showLegend />
              ) : (
                <p className="mono-label border-t border-[#20252C] pt-4 text-[#7B828C]">
                  {readError ?? "ON-CHAIN BASKET DATA WILL APPEAR HERE."}
                </p>
              )}
              {featuredBasket ? (
                <Link
                  href={`/basket/${featuredBasket.address}`}
                  className="mt-8 flex w-full items-center justify-between border border-[#397BFF] px-4 py-3 font-mono text-xs uppercase text-[#397BFF] transition-colors hover:bg-[#397BFF] hover:text-[#080A0C]"
                >
                  VIEW BASKET <IconArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/create"
                  className="mt-8 flex w-full items-center justify-between border border-[#397BFF] px-4 py-3 font-mono text-xs uppercase text-[#397BFF] transition-colors hover:bg-[#397BFF] hover:text-[#080A0C]"
                >
                  CREATE BASKET <IconArrowRight className="h-4 w-4" />
                </Link>
              )}
            </article>
          </div>
        </section>

        <section className="reveal-on-scroll border-y border-[#20252C] bg-[#0B0E11]/95 px-6 py-24 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14">
              <span className="mono-label text-[#397BFF]">
                SECTION 02 / THE MECHANISM
              </span>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                HOW IT WORKS
              </h2>
            </div>
            <div className="grid border-l border-t border-[#20252C] md:grid-cols-3">
              {mechanism.map(({ number, title, copy, Icon }) => (
                <article
                  key={number}
                  className="reveal-on-scroll alive-ring group min-h-64 border-b border-r border-[#20252C] p-6 transition-colors hover:bg-[#101418] sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#397BFF]">{number}</span>
                    <Icon className="h-5 w-5 text-[#7B828C] transition-colors group-hover:text-[#397BFF]" />
                  </div>
                  <h3 className="mt-20 text-2xl font-black tracking-[-0.04em]">
                    {title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[#7B828C]">
                    {copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-36">
          <div className="mb-10 flex items-end justify-between border-b border-[#20252C] pb-6">
            <div>
              <span className="mono-label text-[#397BFF]">
                SECTION 03 / DISCOVERY
              </span>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                LIVE MARKETS
              </h2>
            </div>
            <a
              href="/markets"
              className="mono-label hidden items-center gap-2 text-[#397BFF] sm:flex"
            >
              OPEN EXPLORER <IconArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="overflow-x-auto border border-[#20252C] bg-[#101418]">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="mono-label border-b border-[#20252C]">
                {["BASKET", "COMPOSITION", "SUPPLY", "NETWORK", "STATUS", ""].map(
                  (heading) => (
                    <th key={heading} className="p-4">
                      {heading}
                    </th>
                  ),
                )}
                </tr>
              </thead>
              <tbody>
                {loadingBaskets ? (
                  <tr>
                    <td colSpan={6} className="p-6 font-mono text-xs text-[#7B828C]">
                      LOADING FACTORY BASKETS FROM ROBINHOOD CHAIN...
                    </td>
                  </tr>
                ) : readError ? (
                  <tr>
                    <td colSpan={6} className="p-6 font-mono text-xs text-[#FF5555]">
                      ON-CHAIN DATA UNAVAILABLE: {readError}
                    </td>
                  </tr>
                ) : !factoryAddress ? (
                  <tr>
                    <td colSpan={6} className="p-6 font-mono text-xs text-[#FF5555]">
                      FACTORY CONFIGURATION REQUIRED: {getMissingFactoryMessage()}
                    </td>
                  </tr>
                ) : baskets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 font-mono text-xs text-[#7B828C]">
                      NO BASKETS HAVE BEEN CREATED BY THE CONFIGURED FACTORY.
                    </td>
                  </tr>
                ) : (
                  baskets.map((basket) => (
                    <tr
                      key={basket.address}
                      className="border-b border-[#20252C] last:border-0 hover:bg-[#151A20]"
                    >
                      <td className="p-4 font-mono font-bold text-[#F1F1EA]">
                        ${basket.symbol}
                        <p className="mono-label mt-1 !text-[#7B828C]">{basket.name}</p>
                      </td>
                      <td className="mono-label p-4 !text-[#7B828C]">
                        {basket.assets
                          .map(
                            (asset) =>
                              tokenMetadata.get(asset.toLowerCase())?.symbol ??
                              formatAddress(asset),
                          )
                          .join(" / ")}
                      </td>
                      <td className="financial-value p-4">
                        {formatTokenAmount(basket.totalSupply)}
                      </td>
                      <td className="mono-label p-4 !text-[#7B828C]">
                        {targetChain.testnet ? "TESTNET" : "MAINNET"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`mono-label ${
                            basket.mintingPaused ? "text-[#FF5555]" : "text-[#397BFF]"
                          }`}
                        >
                          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-current" />
                          {basket.mintingPaused ? "MINT PAUSED" : "MINTABLE"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/basket/${basket.address}`}
                          className="mono-label text-[#397BFF]"
                        >
                          OPEN
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="reveal-on-scroll border-y border-[#20252C] px-6 py-24 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 flex items-start justify-between">
              <div>
                <span className="mono-label text-[#397BFF]">
                  SECTION 05 / SETTLEMENT
                </span>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                  THE VAULT IS THE
                  <br />
                  SOURCE OF TRUTH.
                </h2>
              </div>
              <IconBox className="hidden h-10 w-10 text-[#397BFF] sm:block" />
            </div>
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1.1fr_auto_1fr]">
              <div className="reveal-on-scroll reveal-delay-1 border border-[#20252C] bg-[#080A0C]/80 p-6">
                <p className="mono-label">INPUT / UNDERLYING</p>
                <p className="mt-4 font-mono text-xl">APPROVED STOCK TOKENS</p>
                <p className="mono-label mt-3 text-[#7B828C]">
                  WEIGHTED DEPOSIT
                </p>
              </div>
              <IconArrowRight className="hidden text-[#397BFF] md:block" />
              <div className="alive-ring reveal-on-scroll reveal-delay-2 border border-[#397BFF] bg-[#101418] p-8 text-center">
                <IconBox className="mx-auto h-7 w-7 text-[#397BFF]" />
                <p className="mt-4 font-mono text-lg">SKOCCC VAULT</p>
                <p className="mono-label mt-2 text-[#397BFF]">
                  VERIFIED ON-CHAIN
                </p>
              </div>
              <IconArrowRight className="hidden text-[#397BFF] md:block" />
              <div className="reveal-on-scroll reveal-delay-3 border border-[#20252C] bg-[#080A0C]/80 p-6">
                <p className="mono-label">OUTPUT / BASKET</p>
                <p className="mt-4 font-mono text-xl text-[#397BFF]">
                  BASKET ERC-20
                </p>
                <p className="mono-label mt-3 text-[#7B828C]">
                  TRANSFERABLE / REDEEMABLE
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-36">
          <div className="mb-8 flex items-center gap-3">
            <IconActivity className="h-4 w-4 text-[#397BFF]" />
            <span className="mono-label text-[#397BFF]">
              SECTION 07 / NETWORK STATE
            </span>
          </div>
          <div className="alive-ring border border-[#20252C] bg-[#101418] p-5 sm:p-8">
            <div className="mb-8 flex items-center justify-between border-b border-[#20252C] pb-5">
              <p className="font-mono text-sm text-[#7B828C]">
                &gt; SYSTEM_METRICS --LIVE
              </p>
              <span className="mono-label text-[#397BFF]">
                * {blockNumber.data ? `BLOCK ${blockNumber.data.toLocaleString("en-US")}` : "CHAIN SYNCING"}
              </span>
            </div>
            <div className="grid gap-px bg-[#20252C] md:grid-cols-3">
              <MetricCard
                label="APPROVED STOCK TOKENS"
                value={stockTokens.loading ? "--" : stockTokens.data.length.toString()}
                subValue={stockTokens.error ? "REGISTRY ERROR" : "REGISTRY"}
                trend={stockTokens.error ? "down" : "neutral"}
              />
              <MetricCard
                label="MINTABLE BASKETS"
                value={loadingBaskets ? "--" : mintableBaskets.toString()}
                subValue="FACTORY READ"
                trend="neutral"
              />
              <MetricCard
                label="BASKETS CREATED"
                value={loadingBaskets ? "--" : baskets.length.toString()}
                subValue={`${targetChain.testnet ? "TESTNET" : "MAINNET"} / ${targetChain.id}`}
                trend="neutral"
              />
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll border-t border-[#20252C] px-6 py-28 sm:py-40 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <p className="mono-label mb-8 text-[#397BFF]">
              THE NEXT MOVE IS YOURS.
            </p>
            <h2 className="max-w-6xl text-[clamp(3.5rem,9vw,9rem)] font-black leading-[0.84] tracking-[-0.09em]">
              YOUR THESIS
              <br />
              SHOULDN&apos;T NEED
              <br />
              <span className="text-[#397BFF]">PERMISSION.</span>
            </h2>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <a
                href="/create"
                className="flex items-center justify-center gap-4 bg-[#397BFF] px-6 py-4 font-mono text-sm font-bold text-[#080A0C] transition-colors hover:bg-[#F1F1EA]"
              >
                CREATE MARKET <IconArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/terminal"
                className="flex items-center justify-center gap-4 border border-[#397BFF] px-6 py-4 font-mono text-sm font-bold text-[#397BFF] transition-colors hover:bg-[#397BFF] hover:text-[#080A0C]"
              >
                ENTER TERMINAL <IconArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
