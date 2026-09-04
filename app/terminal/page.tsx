"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatUnits, type Address } from "viem";
import { useConnection, useReadContract, useReadContracts } from "wagmi";
import {
  CompositionBar,
  Header,
  IconActivity,
  IconArrowRight,
  IconBox,
  IconWallet,
  MetricCard,
} from "../components";
import { basketFactoryAbi, basketVaultAbi, erc20Abi } from "../contracts/abis";
import {
  getBasketFactoryAddress,
  getMissingFactoryMessage,
} from "../contracts/addresses";
import { useOfficialStockTokens } from "../hooks/use-stock-tokens";
import { targetChain } from "../web3/chains";
import { formatAddress, getErrorText } from "../web3/format";
import { WalletControl } from "../wallet-control";

const ZERO = BigInt(0);
const MULTIPLIER_SCALE = BigInt(10) ** BigInt(18);

function formatTokenAmount(value: bigint | undefined, maximumFractionDigits = 4) {
  return Number(formatUnits(value ?? ZERO, 18)).toLocaleString("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
}

function readResult<T>(
  reads: readonly { result?: unknown }[] | undefined,
  index: number,
  fallback: T,
) {
  return (reads?.[index]?.result as T | undefined) ?? fallback;
}

export default function TerminalView() {
  const connection = useConnection();
  const factoryAddress = getBasketFactoryAddress();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const tokenRegistry = useOfficialStockTokens(targetChain.id, {
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

  const activeAddress =
    selectedAddress && basketAddresses.includes(selectedAddress)
      ? selectedAddress
      : (basketAddresses.at(-1) ?? null);

  const basketReads = useReadContracts({
    contracts: basketAddresses.flatMap((address) => [
      { address, abi: basketVaultAbi, functionName: "name" as const },
      { address, abi: basketVaultAbi, functionName: "symbol" as const },
    ]),
    query: {
      enabled: basketAddresses.length > 0,
      refetchInterval: 15_000,
    },
  });
  const selectedBasket = useMemo(() => {
    if (!activeAddress) return null;

    const index = basketAddresses.findIndex((address) => address === activeAddress);

    if (index < 0) return null;

    return {
      address: activeAddress,
      name: readResult(basketReads.data, index * 2, "Unnamed basket"),
      symbol: readResult(basketReads.data, index * 2 + 1, "BASKET"),
    };
  }, [activeAddress, basketAddresses, basketReads.data]);
  const enabled = Boolean(selectedBasket);
  const totalSupply = useReadContract({
    address: selectedBasket?.address,
    abi: basketVaultAbi,
    functionName: "totalSupply",
    query: { enabled, refetchInterval: 15_000 },
  });
  const walletBalance = useReadContract({
    address: selectedBasket?.address,
    abi: basketVaultAbi,
    functionName: "balanceOf",
    args: connection.address ? [connection.address] : undefined,
    query: { enabled: enabled && Boolean(connection.address), refetchInterval: 15_000 },
  });
  const composition = useReadContract({
    address: selectedBasket?.address,
    abi: basketVaultAbi,
    functionName: "getComposition",
    query: { enabled, refetchInterval: 15_000 },
  });
  const reserves = useReadContract({
    address: selectedBasket?.address,
    abi: basketVaultAbi,
    functionName: "getReserves",
    query: { enabled, refetchInterval: 15_000 },
  });
  const [assets, weights] = useMemo(() => {
    if (!composition.data) return [[], []] as [Address[], number[]];

    return [
      [...composition.data[0]],
      composition.data[1].map(Number),
    ] as [Address[], number[]];
  }, [composition.data]);
  const multiplierReads = useReadContracts({
    contracts: assets.map((address) => ({
      address,
      abi: erc20Abi,
      functionName: "uiMultiplier" as const,
    })),
    query: { enabled: assets.length > 0, refetchInterval: 30_000 },
  });
  const tokenMetadata = useMemo(
    () =>
      new Map(
        tokenRegistry.data.map((token) => [
          token.contractAddress.toLowerCase(),
          token,
        ]),
      ),
    [tokenRegistry.data],
  );
  const reservesByAsset = (reserves.data ?? []) as bigint[];
  const loading =
    factoryBaskets.isLoading ||
    factoryBaskets.isFetching ||
    basketReads.isLoading ||
    basketReads.isFetching ||
    (enabled && (composition.isLoading || reserves.isLoading));
  const readError = getErrorText(
    factoryBaskets.error ??
      basketReads.error ??
      totalSupply.error ??
      composition.error ??
      reserves.error ??
      multiplierReads.error,
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080A0C] text-[#F1F1EA]">
      <Header activePath="/terminal" />
      <div className="technical-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="reveal-on-scroll flex flex-col justify-between gap-4 border-b border-[#20252C] pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="mono-label mb-2 text-[#397BFF]">[ FACTORY TERMINAL ]</p>
            <h1 className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              SKOCCC / {selectedBasket?.symbol ?? "BASKETS"}
            </h1>
            <p className="mt-2 font-mono text-[11px] text-[#7B828C]">
              {selectedBasket?.name ?? "READING THE CONFIGURED FACTORY"} / {targetChain.name.toUpperCase()}
            </p>
          </div>
          {basketAddresses.length > 0 ? (
            <label className="flex min-w-[220px] items-center gap-2 border border-[#20252C] bg-[#101418] px-3 py-2 font-mono text-xs text-[#F1F1EA]">
              <span className="sr-only">Select basket</span>
              <select
                value={activeAddress ?? ""}
                onChange={(event) => setSelectedAddress(event.target.value as Address)}
                className="w-full appearance-none bg-transparent outline-none"
              >
                {basketAddresses.map((address, index) => (
                  <option key={address} className="bg-[#101418]" value={address}>
                    ${readResult(basketReads.data, index * 2 + 1, "BASKET")} / {formatAddress(address)}
                  </option>
                ))}
              </select>
              <IconArrowRight size={14} />
            </label>
          ) : null}
        </section>

        {!factoryAddress ? (
          <section className="mt-5 border border-[#FF5555]/50 bg-[#101418] p-5">
            <h2 className="font-mono text-sm font-bold">FACTORY CONFIGURATION REQUIRED</h2>
            <p className="mt-2 font-mono text-xs text-[#7B828C]">
              {getMissingFactoryMessage()}
            </p>
          </section>
        ) : readError ? (
          <section className="mt-5 border border-[#FF5555]/50 bg-[#101418] p-5">
            <h2 className="font-mono text-sm font-bold">ON-CHAIN DATA UNAVAILABLE</h2>
            <p className="mt-2 font-mono text-xs text-[#7B828C]">{readError}</p>
          </section>
        ) : loading ? (
          <section className="mt-5 border border-[#20252C] bg-[#101418] p-5 font-mono text-xs text-[#7B828C]">
            LOADING FACTORY BASKETS AND VAULT STATE...
          </section>
        ) : basketAddresses.length === 0 ? (
          <section className="mt-5 border border-[#20252C] bg-[#101418] p-5">
            <IconBox size={18} className="text-[#397BFF]" />
            <h2 className="mt-4 font-mono text-sm font-bold">NO FACTORY BASKETS YET</h2>
            <Link
              href="/create"
              className="mt-5 inline-flex items-center gap-2 border border-[#397BFF] px-4 py-3 font-mono text-xs text-[#397BFF] hover:bg-[#397BFF] hover:text-[#080A0C]"
            >
              CREATE BASKET <IconArrowRight size={14} />
            </Link>
          </section>
        ) : selectedBasket ? (
          <>
            <section className="reveal-on-scroll reveal-delay-1 mt-5 grid grid-cols-2 border-x border-b border-[#20252C] sm:grid-cols-4">
              <MetricCard
                label="TOTAL SUPPLY"
                value={formatTokenAmount(totalSupply.data)}
              />
              <MetricCard label="ASSETS" value={assets.length.toString()} />
              <MetricCard
                label="YOUR BALANCE"
                value={connection.isConnected ? formatTokenAmount(walletBalance.data) : "--"}
              />
              <MetricCard
                label="NETWORK"
                value={targetChain.testnet ? "TESTNET" : "MAINNET"}
                subValue={targetChain.id.toString()}
                trend="neutral"
              />
            </section>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(340px,1fr)]">
              <section className="min-w-0 space-y-5">
                <article className="alive-ring terminal-panel !p-0">
                  <header className="flex items-center justify-between border-b border-[#20252C] px-5 py-4">
                    <div>
                      <p className="mono-label text-[#F1F1EA]">[ VAULT COMPOSITION ]</p>
                      <p className="mt-1 font-mono text-[11px] text-[#7B828C]">
                        RAW RESERVES / MULTIPLIER-ADJUSTED EXPOSURE
                      </p>
                    </div>
                    <IconActivity size={15} className="text-[#397BFF]" />
                  </header>
                  <div className="p-5">
                    <CompositionBar
                      assets={assets.map((asset, index) => ({
                        symbol:
                          tokenMetadata.get(asset.toLowerCase())?.symbol ??
                          formatAddress(asset),
                        weight: (weights[index] ?? 0) / 100,
                      }))}
                      showLegend
                    />
                  </div>
                  <div className="divide-y divide-[#20252C] border-t border-[#20252C] md:hidden">
                    {assets.map((asset, index) => {
                      const token = tokenMetadata.get(asset.toLowerCase());
                      const multiplier =
                        multiplierReads.data?.[index]?.result ?? MULTIPLIER_SCALE;
                      const reserve = reservesByAsset[index] ?? ZERO;

                      return (
                        <article key={asset} className="p-4">
                          <div className="flex justify-between gap-3">
                            <div className="min-w-0">
                              <p className="financial-value text-sm">
                                {token?.symbol ?? formatAddress(asset)}
                              </p>
                              <p className="mono-label mt-1 break-all text-[9px] text-[#7B828C]">
                                {token?.name ?? asset}
                              </p>
                            </div>
                            <span className="financial-value text-xs text-[#397BFF]">
                              {((weights[index] ?? 0) / 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#20252C] pt-3">
                            <div>
                              <p className="mono-label text-[9px]">RAW RESERVE</p>
                              <p className="financial-value mt-1 text-xs">{formatTokenAmount(reserve)}</p>
                            </div>
                            <div>
                              <p className="mono-label text-[9px]">UI EXPOSURE</p>
                              <p className="financial-value mt-1 text-xs text-[#397BFF]">
                                {formatTokenAmount((reserve * multiplier) / MULTIPLIER_SCALE)}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <div className="hidden overflow-x-auto border-t border-[#20252C] md:block">
                    <table className="w-full min-w-[700px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#20252C] font-mono text-[10px] uppercase text-[#7B828C]">
                          {["ASSET", "WEIGHT", "RAW RESERVE", "UI EXPOSURE", "PRICE"].map((heading) => (
                            <th key={heading} className="px-5 py-3 font-normal">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {assets.map((asset, index) => {
                          const token = tokenMetadata.get(asset.toLowerCase());
                          const multiplier =
                            multiplierReads.data?.[index]?.result ?? MULTIPLIER_SCALE;
                          const reserve = reservesByAsset[index] ?? ZERO;

                          return (
                            <tr key={asset} className="border-b border-[#20252C] last:border-0 hover:bg-[#151A20]">
                              <th scope="row" className="px-5 py-4 font-mono font-normal">
                                <span className="block text-sm font-bold text-[#F1F1EA]">
                                  {token?.symbol ?? formatAddress(asset)}
                                </span>
                                <span className="mt-1 block text-[10px] text-[#7B828C]">
                                  {token?.name ?? asset}
                                </span>
                              </th>
                              <td className="px-5 py-4 font-mono text-xs">{((weights[index] ?? 0) / 100).toFixed(2)}%</td>
                              <td className="px-5 py-4 font-mono text-xs">{formatTokenAmount(reserve)}</td>
                              <td className="px-5 py-4 font-mono text-xs text-[#397BFF]">
                                {formatTokenAmount((reserve * multiplier) / MULTIPLIER_SCALE)}
                              </td>
                              <td className="px-5 py-4 font-mono text-xs">
                                {token?.priceUsd === null || token?.priceUsd === undefined
                                  ? "N/A"
                                  : `$${token.priceUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <footer className="flex flex-wrap items-center gap-2 border-t border-[#20252C] px-5 py-3 font-mono text-[10px] text-[#7B828C]">
                    <IconBox size={13} className="text-[#397BFF]" />
                    <span>[ VAULT CONTRACT ]</span>
                    <span className="ml-auto break-all text-[#397BFF]">{selectedBasket.address}</span>
                  </footer>
                </article>
              </section>

              <aside className="alive-ring terminal-panel !p-0 lg:self-start">
                <header className="border-b border-[#20252C] px-5 py-5">
                  <p className="mono-label text-[#397BFF]">[ BASKET OPERATIONS ]</p>
                  <h2 className="mt-2 text-xl font-bold">${selectedBasket.symbol}</h2>
                  <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#7B828C]">
                    Mint, redeem, and transfer this exact factory-created basket.
                  </p>
                </header>
                <div className="space-y-5 p-5">
                  {!connection.isConnected ? (
                    <div className="border border-[#20252C] bg-[#0B0E12] p-4">
                      <IconWallet size={16} className="text-[#397BFF]" />
                      <p className="mt-3 font-mono text-xs text-[#7B828C]">
                        CONNECT YOUR WALLET TO VIEW YOUR BALANCE AND OPERATE THIS BASKET.
                      </p>
                      <div className="mt-4"><WalletControl /></div>
                    </div>
                  ) : (
                    <div className="border border-[#20252C] bg-[#0B0E12] p-4">
                      <p className="mono-label">YOUR BASKET BALANCE</p>
                      <p className="financial-value mt-2 text-2xl">
                        {formatTokenAmount(walletBalance.data)} {selectedBasket.symbol}
                      </p>
                    </div>
                  )}
                  <Link
                    href={`/basket/${selectedBasket.address}`}
                    className="flex w-full items-center justify-center gap-2 bg-[#397BFF] px-4 py-3 font-mono text-xs font-bold text-[#080A0C] transition-colors hover:bg-[#6B99FF]"
                  >
                    OPEN MINT / REDEEM / TRANSFER <IconArrowRight size={15} />
                  </Link>
                  <Link
                    href="/portfolio"
                    className="flex w-full items-center justify-center gap-2 border border-[#397BFF] px-4 py-3 font-mono text-xs text-[#397BFF] transition-colors hover:bg-[#397BFF]/10"
                  >
                    VIEW ON-CHAIN PORTFOLIO <IconWallet size={14} />
                  </Link>
                </div>
                <footer className="border-t border-[#20252C] px-5 py-4 font-mono text-[10px] text-[#7B828C]">
                  [ DATA READ FROM THE CONFIGURED ROBINHOOD CHAIN FACTORY ]
                </footer>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
