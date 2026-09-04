"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useConnection, useReadContract, useReadContracts } from "wagmi";
import {
  Footer,
  Header,
  IconArrowRight,
  IconBox,
  IconWallet,
} from "../components";
import { basketFactoryAbi, basketVaultAbi, erc20Abi } from "../contracts/abis";
import {
  getBasketFactoryAddress,
  getMissingFactoryMessage,
} from "../contracts/addresses";
import { useOfficialStockTokens } from "../hooks/use-stock-tokens";
import { getSupportedChain, targetChain } from "../web3/chains";
import { formatAddress, getErrorText } from "../web3/format";
import { WalletControl } from "../wallet-control";

const ZERO = BigInt(0);
const MULTIPLIER_SCALE = parseUnits("1", 18);

type BasketSnapshot = {
  address: Address;
  name: string;
  symbol: string;
  balance: bigint;
  totalSupply: bigint;
  assets: Address[];
  weights: number[];
  reserves: bigint[];
};

function formatTokenAmount(value: bigint, maximumFractionDigits = 4) {
  return Number(formatUnits(value, 18)).toLocaleString("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
}

function formatMultiplier(value: bigint) {
  return `${Number(formatUnits(value, 18)).toLocaleString("en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  })}x`;
}

function parseRegistryMultiplier(value: string | undefined) {
  if (!value) return MULTIPLIER_SCALE;

  try {
    return parseUnits(value, 18);
  } catch {
    return MULTIPLIER_SCALE;
  }
}

function proportionalClaim(reserve: bigint, balance: bigint, totalSupply: bigint) {
  if (totalSupply === ZERO) return ZERO;

  return (reserve * balance) / totalSupply;
}

function readResult<T>(
  reads: readonly { result?: unknown }[] | undefined,
  index: number,
  fallback: T,
) {
  return (reads?.[index]?.result as T | undefined) ?? fallback;
}

export default function PortfolioDashboard() {
  const connection = useConnection();
  const factoryAddress = getBasketFactoryAddress();
  const chainReady =
    connection.isConnected && Number(connection.chainId) === Number(targetChain.id);
  const { data: officialTokens, error: tokenRegistryError } = useOfficialStockTokens(
    targetChain.id,
  );
  const baskets = useReadContract({
    address: factoryAddress ?? undefined,
    abi: basketFactoryAbi,
    functionName: "getBaskets",
    query: {
      enabled: Boolean(factoryAddress && chainReady),
      refetchInterval: 15_000,
    },
  });
  const basketAddresses = useMemo(
    () => [...(baskets.data ?? [])] as Address[],
    [baskets.data],
  );
  const basketReads = useReadContracts({
    contracts: basketAddresses.flatMap((address) => [
      { address, abi: basketVaultAbi, functionName: "name" as const },
      { address, abi: basketVaultAbi, functionName: "symbol" as const },
      { address, abi: basketVaultAbi, functionName: "totalSupply" as const },
      {
        address,
        abi: basketVaultAbi,
        functionName: "balanceOf" as const,
        args: connection.address ? [connection.address] : undefined,
      },
      { address, abi: basketVaultAbi, functionName: "getComposition" as const },
      { address, abi: basketVaultAbi, functionName: "getReserves" as const },
    ]),
    query: {
      enabled: Boolean(chainReady && connection.address && basketAddresses.length > 0),
      refetchInterval: 15_000,
    },
  });

  const positions = useMemo(() => {
    const reads = basketReads.data;

    return basketAddresses.flatMap((address, basketIndex) => {
      const offset = basketIndex * 6;
      const balance = readResult(reads, offset + 3, ZERO);

      if (balance <= ZERO) return [];

      const composition = readResult<readonly [readonly Address[], readonly number[]]>(
        reads,
        offset + 4,
        [[], []],
      );

      return [
        {
          address,
          name: readResult(reads, offset, "Unnamed basket"),
          symbol: readResult(reads, offset + 1, "BASKET"),
          totalSupply: readResult(reads, offset + 2, ZERO),
          balance,
          assets: [...composition[0]],
          weights: composition[1].map(Number),
          reserves: [...readResult<readonly bigint[]>(reads, offset + 5, [])],
        } satisfies BasketSnapshot,
      ];
    });
  }, [basketAddresses, basketReads.data]);

  const uniqueAssets = useMemo(
    () =>
      [...new Set(positions.flatMap((position) => position.assets))] as Address[],
    [positions],
  );
  const multiplierReads = useReadContracts({
    contracts: uniqueAssets.map((address) => ({
      address,
      abi: erc20Abi,
      functionName: "uiMultiplier" as const,
    })),
    query: {
      enabled: Boolean(chainReady && uniqueAssets.length > 0),
      refetchInterval: 30_000,
    },
  });

  const tokenMetadata = useMemo(
    () =>
      new Map(
        officialTokens.map((token) => [token.contractAddress.toLowerCase(), token]),
      ),
    [officialTokens],
  );
  const multipliers = useMemo(
    () =>
      new Map(
        uniqueAssets.map((asset, index) => {
          const onchainMultiplier = multiplierReads.data?.[index]?.result;
          const fallbackMultiplier = parseRegistryMultiplier(
            tokenMetadata.get(asset.toLowerCase())?.currentMultiplier,
          );

          return [
            asset.toLowerCase(),
            typeof onchainMultiplier === "bigint"
              ? onchainMultiplier
              : fallbackMultiplier,
          ] as const;
        }),
      ),
    [multiplierReads.data, tokenMetadata, uniqueAssets],
  );

  const activeChain = getSupportedChain(Number(connection.chainId));
  const rpcError = getErrorText(
    baskets.error ?? basketReads.error ?? multiplierReads.error,
  );
  const loadingPositions =
    chainReady &&
    (baskets.isLoading ||
      baskets.isFetching ||
      basketReads.isLoading ||
      basketReads.isFetching);
  const hasReadError = Boolean(rpcError);

  return (
    <div className="min-h-screen bg-[#080A0C] text-[#F1F1EA]">
      <Header activePath="/portfolio" />
      <main className="relative mx-auto max-w-[1440px] overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
        <div className="technical-grid" aria-hidden="true" />
        <div className="relative z-10 bg-[#080A0C]/95">
          <section
            className="reveal-on-scroll border-b border-[#20252C] pb-10 pt-4"
            aria-labelledby="portfolio-title"
          >
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="mono-label mb-4 text-[#397BFF]">[ ACCOUNT / ON-CHAIN ]</p>
                <h1
                  id="portfolio-title"
                  className="max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.05em] text-[#F1F1EA] sm:text-6xl lg:text-7xl"
                >
                  YOUR <span className="text-[#397BFF]">PORTFOLIO</span>
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-6 text-[#7B828C] sm:text-base">
                  Basket ownership, reserves, and redemption claims read directly
                  from Robinhood Chain.
                </p>
              </div>
              {connection.isConnected ? (
                <div className="border border-[#20252C] bg-[#101418] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <IconWallet size={16} className="text-[#397BFF]" />
                    <span className="financial-value text-xs text-[#F1F1EA]">
                      {formatAddress(connection.address)}
                    </span>
                    <span
                      className={`mono-label text-[9px] ${
                        chainReady ? "text-[#397BFF]" : "text-[#FF5555]"
                      }`}
                    >
                      {chainReady ? "CONNECTED" : "WRONG NETWORK"}
                    </span>
                  </div>
                  <p className="mono-label mt-2 text-[9px] text-[#7B828C]">
                    {activeChain?.name ?? `CHAIN ${connection.chainId ?? "UNKNOWN"}`}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-12 grid gap-px border border-[#20252C] bg-[#20252C] sm:grid-cols-3">
              <div className="bg-[#101418] px-4 py-4">
                <p className="mono-label mb-2 text-[9px]">ACTIVE POSITIONS</p>
                <p className="financial-value text-lg">
                  {chainReady && !loadingPositions ? positions.length : "--"}
                </p>
              </div>
              <div className="bg-[#101418] px-4 py-4">
                <p className="mono-label mb-2 text-[9px]">NETWORK</p>
                <p className="financial-value text-sm">
                  {targetChain.name.toUpperCase()}
                </p>
              </div>
              <div className="bg-[#101418] px-4 py-4">
                <p className="mono-label mb-2 text-[9px]">FACTORY</p>
                <p className="financial-value text-sm">
                  {factoryAddress ? formatAddress(factoryAddress) : "NOT CONFIGURED"}
                </p>
              </div>
            </div>
          </section>

          <section
            className="reveal-on-scroll py-10"
            aria-labelledby="positions-title"
          >
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="mono-label mb-2 text-[#397BFF]">[ HOLDINGS / CHAIN ]</p>
                <h2
                  id="positions-title"
                  className="text-2xl font-black tracking-[-0.04em] sm:text-3xl"
                >
                  Positions
                </h2>
              </div>
              <span className="mono-label hidden text-[9px] sm:block">
                RAW CLAIMS / MULTIPLIER-ADJUSTED EXPOSURE
              </span>
            </div>

            {!connection.isConnected ? (
              <div className="border border-[#20252C] bg-[#101418] px-5 py-8 sm:px-8">
                <IconWallet size={20} className="text-[#397BFF]" />
                <h3 className="mt-4 text-xl font-bold">
                  CONNECT A WALLET TO VIEW POSITIONS
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#7B828C]">
                  This portfolio only displays basket tokens held by your
                  connected address.
                </p>
                <div className="mt-6">
                  <WalletControl />
                </div>
              </div>
            ) : !chainReady ? (
              <div className="border border-[#FF5555]/50 bg-[#101418] px-5 py-8 sm:px-8">
                <h3 className="text-xl font-bold text-[#F1F1EA]">
                  SWITCH TO {targetChain.name.toUpperCase()}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#7B828C]">
                  Portfolio reads are disabled until the connected wallet is on
                  the configured Robinhood Chain network.
                </p>
                <div className="mt-6">
                  <WalletControl />
                </div>
              </div>
            ) : !factoryAddress ? (
              <div className="border border-[#FF5555]/50 bg-[#101418] px-5 py-8 sm:px-8">
                <h3 className="text-xl font-bold">FACTORY CONFIGURATION REQUIRED</h3>
                <p className="mt-2 font-mono text-xs leading-6 text-[#7B828C]">
                  {getMissingFactoryMessage()}
                </p>
              </div>
            ) : loadingPositions ? (
              <div className="border border-[#20252C] bg-[#101418] px-5 py-10 font-mono text-xs text-[#7B828C]">
                LOADING FACTORY BASKETS AND ON-CHAIN BALANCES...
              </div>
            ) : hasReadError ? (
              <div className="border border-[#FF5555]/50 bg-[#101418] px-5 py-8 sm:px-8">
                <h3 className="text-xl font-bold">ON-CHAIN DATA UNAVAILABLE</h3>
                <p className="mt-2 max-w-xl font-mono text-xs leading-6 text-[#7B828C]">
                  {rpcError}
                </p>
              </div>
            ) : positions.length === 0 ? (
              <div className="border border-[#20252C] bg-[#101418] px-5 py-10 sm:px-8">
                <IconBox size={20} className="text-[#397BFF]" />
                <h3 className="mt-4 text-xl font-bold">NO BASKET POSITIONS</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#7B828C]">
                  This address does not hold any basket tokens created by the
                  configured factory.
                </p>
                <Link
                  href="/markets"
                  className="mt-6 inline-flex items-center gap-2 border border-[#397BFF] px-4 py-3 font-mono text-xs font-bold text-[#397BFF] transition-colors hover:bg-[#397BFF] hover:text-[#080A0C]"
                >
                  EXPLORE STOCK TOKENS <IconArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {tokenRegistryError ? (
                  <p className="border border-[#FFD600]/50 bg-[#101418] px-4 py-3 font-mono text-[10px] leading-5 text-[#FFD600]">
                    OFFICIAL TOKEN METADATA IS UNAVAILABLE. ON-CHAIN POSITION
                    DATA IS STILL SHOWN BY CONTRACT ADDRESS.
                  </p>
                ) : null}
                {positions.map((position) => (
                  <Link
                    key={position.address}
                    href={`/basket/${position.address}`}
                    className="alive-ring block border border-[#20252C] bg-[#101418] transition-colors hover:border-[#397BFF]"
                  >
                    <article className="p-5 sm:p-6">
                      <div className="flex flex-col justify-between gap-5 border-b border-[#20252C] pb-5 md:flex-row md:items-start">
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-1.5 h-2 w-2 bg-[#397BFF]"
                            aria-hidden="true"
                          />
                          <div>
                            <h3 className="text-lg font-bold tracking-wide text-[#F1F1EA]">
                              {position.name}
                            </h3>
                            <p className="financial-value mt-1 text-xs text-[#397BFF]">
                              {position.symbol}
                            </p>
                            <p className="financial-value mt-2 text-[10px] text-[#7B828C]">
                              {position.address}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-right sm:flex sm:gap-8">
                          <div>
                            <p className="mono-label text-[9px]">YOUR BALANCE</p>
                            <p className="financial-value mt-1 text-sm">
                              {formatTokenAmount(position.balance)} {position.symbol}
                            </p>
                          </div>
                          <div>
                            <p className="mono-label text-[9px]">TOTAL SUPPLY</p>
                            <p className="financial-value mt-1 text-sm text-[#B7BDC5]">
                              {formatTokenAmount(position.totalSupply)} {position.symbol}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[650px] border-collapse text-left">
                          <caption className="sr-only">
                            Underlying composition and this wallet&apos;s proportional
                            redemption claim for {position.name}
                          </caption>
                          <thead className="border-b border-[#20252C]">
                            <tr>
                              {[
                                "ASSET",
                                "WEIGHT",
                                "VAULT RESERVE (RAW)",
                                "YOUR CLAIM (RAW)",
                                "UI EXPOSURE",
                              ].map((heading) => (
                                <th
                                  key={heading}
                                  className="px-2 py-3 text-right first:pl-0 first:text-left"
                                >
                                  <span className="mono-label text-[9px]">
                                    {heading}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {position.assets.map((asset, index) => {
                              const token = tokenMetadata.get(asset.toLowerCase());
                              const multiplier =
                                multipliers.get(asset.toLowerCase()) ??
                                MULTIPLIER_SCALE;
                              const claim = proportionalClaim(
                                position.reserves[index] ?? ZERO,
                                position.balance,
                                position.totalSupply,
                              );
                              const uiClaim = (claim * multiplier) / MULTIPLIER_SCALE;

                              return (
                                <tr
                                  key={asset}
                                  className="border-b border-[#20252C] last:border-0"
                                >
                                  <td className="py-3 pr-2">
                                    <p className="font-mono text-xs font-bold text-[#F1F1EA]">
                                      {token?.symbol ?? formatAddress(asset)}
                                    </p>
                                    <p className="financial-value mt-1 text-[10px] text-[#7B828C]">
                                      {token?.name ?? asset}
                                    </p>
                                  </td>
                                  <td className="financial-value px-2 py-3 text-right text-xs">
                                    {((position.weights[index] ?? 0) / 100).toFixed(2)}%
                                  </td>
                                  <td className="financial-value px-2 py-3 text-right text-xs text-[#B7BDC5]">
                                    {formatTokenAmount(position.reserves[index] ?? ZERO)}
                                  </td>
                                  <td className="financial-value px-2 py-3 text-right text-xs text-[#F1F1EA]">
                                    {formatTokenAmount(claim)}
                                  </td>
                                  <td className="px-0 py-3 text-right">
                                    <p className="financial-value text-xs text-[#397BFF]">
                                      {formatTokenAmount(uiClaim)}
                                    </p>
                                    <p className="financial-value mt-1 text-[10px] text-[#7B828C]">
                                      {formatMultiplier(multiplier)}
                                    </p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-5 flex items-center justify-end gap-2 font-mono text-[10px] font-bold text-[#397BFF]">
                        OPEN BASKET <IconArrowRight size={13} />
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
