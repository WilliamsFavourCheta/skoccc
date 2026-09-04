"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Footer,
  Header,
  IconArrowRight,
  IconSearch,
  IconTrendingUp,
} from "../components";
import { useOfficialStockTokens } from "../hooks/use-stock-tokens";
import type { OfficialStockToken } from "../lib/stock-tokens";
import {
  ROBINHOOD_MAINNET_CHAIN_ID,
  getSupportedChain,
} from "../web3/chains";
import { formatAddress } from "../web3/format";

const validatedSymbols = ["AAPL", "NVDA", "MSFT", "GOOGL"] as const;
const validatedSymbolSet = new Set<string>(validatedSymbols);

function formatUsd(value: number | null) {
  if (value === null) return "UNAVAILABLE";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatMultiplier(value: string) {
  const multiplier = Number(value);

  if (!Number.isFinite(multiplier)) return "1.0000X";

  return `${multiplier.toLocaleString("en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 4,
  })}X`;
}

function getPriority(symbol: string) {
  const index = validatedSymbols.findIndex((item) => item === symbol);

  return index === -1 ? validatedSymbols.length : index;
}

function compareTokens(a: OfficialStockToken, b: OfficialStockToken) {
  const priorityDelta = getPriority(a.symbol) - getPriority(b.symbol);

  if (priorityDelta !== 0) return priorityDelta;

  return a.symbol.localeCompare(b.symbol);
}

export default function MarketExplorer() {
  const [query, setQuery] = useState("");
  const network = getSupportedChain(ROBINHOOD_MAINNET_CHAIN_ID);
  const {
    data: stockTokens,
    error,
    loading,
  } = useOfficialStockTokens(ROBINHOOD_MAINNET_CHAIN_ID, {
    includePrices: true,
  });

  const displayedTokens = useMemo(() => {
    const search = query.trim().toLowerCase();

    return [...stockTokens]
      .sort(compareTokens)
      .filter((token) => {
        if (!search) return true;

        return `${token.symbol} ${token.name}`
          .toLowerCase()
          .includes(search);
      });
  }, [query, stockTokens]);

  return (
    <div className="min-h-screen bg-[#080A0C] text-[#F1F1EA]">
      <Header activePath="/markets" />
      <main className="relative overflow-hidden">
        <div className="technical-grid" aria-hidden="true" />
        <section className="relative z-10 mx-auto max-w-7xl px-5 pb-14 pt-14 sm:px-8 lg:pt-20">
          <div className="reveal-on-scroll flex flex-col justify-between gap-8 border-b border-[#20252C] pb-10 md:flex-row md:items-end">
            <div>
              <p className="mono-label mb-4 text-[#397BFF]">
                [ STOCK_TOKEN_DIRECTORY / ROBINHOOD ]
              </p>
              <h1 className="text-5xl font-black tracking-[-0.07em] text-[#F1F1EA] sm:text-7xl">
                MARKETS
              </h1>
              <p className="mt-4 text-base text-[#7B828C]">
                Official Robinhood Stock Tokens available for SKOCCC baskets.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-l border-[#20252C] pl-5 md:min-w-[255px]">
              {[
                ["NETWORK", network?.name ?? "ROBINHOOD"],
                ["CHAIN", ROBINHOOD_MAINNET_CHAIN_ID.toString()],
                ["TOKENS", loading ? "..." : stockTokens.length.toString()],
                ["STATUS", error ? "ERROR" : loading ? "SYNC" : "LIVE"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="mono-label">{label}</p>
                  <p
                    className={`financial-value mt-1 text-lg ${
                      label === "STATUS" && !error ? "text-[#397BFF]" : ""
                    } ${label === "STATUS" && error ? "text-red-300" : ""}`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal-on-scroll reveal-delay-1 flex flex-col gap-4 border-b border-[#20252C] py-6 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex h-11 w-full items-center gap-3 border border-[#20252C] bg-[#101418] px-3 transition-colors focus-within:border-[#397BFF] lg:max-w-md">
              <IconSearch size={16} className="text-[#7B828C]" />
              <span className="sr-only">Search Stock Tokens</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="SEARCH SYMBOL OR COMPANY..."
                className="w-full bg-transparent font-mono text-xs uppercase tracking-wider text-[#F1F1EA] outline-none placeholder:text-[#7B828C]"
              />
              <span className="mono-label hidden text-[10px] sm:block">/</span>
            </label>
            <Link
              href="/create"
              className="flex items-center justify-center gap-2 border border-[#397BFF] bg-[#397BFF] px-4 py-3 font-mono text-[10px] font-bold tracking-[0.12em] text-[#080A0C] transition-colors hover:bg-transparent hover:text-[#397BFF]"
            >
              <span>CREATE BASKET</span>
              <IconArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="alive-ring mt-8 border border-[#20252C] bg-[#101418] p-10">
              <p className="mono-label text-[#7B828C]">
                LOADING LIVE ROBINHOOD STOCK TOKEN REGISTRY
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="alive-ring mt-8 border border-red-500/50 bg-[#101418] p-10">
              <p className="mono-label text-red-300">{error}</p>
            </div>
          ) : null}

          {!loading && !error && displayedTokens.length === 0 ? (
            <div className="alive-ring mt-8 border border-[#20252C] bg-[#101418] p-10">
              <p className="mono-label text-[#7B828C]">
                NO STOCK TOKENS MATCH YOUR QUERY.
              </p>
            </div>
          ) : null}

          {!loading && !error && displayedTokens.length > 0 ? (
            <div className="alive-ring mt-8 hidden overflow-x-auto border border-[#20252C] bg-[#080A0C]/80 md:block">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <caption className="sr-only">
                  Official Robinhood Stock Tokens
                </caption>
                <thead>
                  <tr className="border-b border-[#20252C] bg-[#101418]">
                    {[
                      "TOKEN",
                      "CURRENT PRICE",
                      "MULTIPLIER",
                      "CONTRACT",
                      "NETWORK",
                      "STATUS",
                      "ACTION",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-4 font-mono text-[10px] font-normal tracking-[0.1em] text-[#7B828C]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedTokens.map((token) => {
                    const isValidated = validatedSymbolSet.has(token.symbol);

                    return (
                      <tr
                        key={`${token.chainId}-${token.contractAddress}`}
                        className="group border-b border-[#20252C] last:border-0 hover:bg-[#101418]"
                      >
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center border border-[#20252C] font-mono text-xs text-[#397BFF]">
                              {token.symbol.slice(0, 2)}
                            </span>
                            <div>
                              <p className="font-bold tracking-wide">
                                {token.symbol}
                              </p>
                              <p className="mono-label mt-1 text-[9px] text-[#7B828C]">
                                {token.name}
                              </p>
                              {isValidated ? (
                                <p className="mono-label mt-2 text-[9px] text-[#397BFF]">
                                  V1 VALIDATED
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="financial-value px-4 py-5 text-sm">
                          {formatUsd(token.priceUsd)}
                        </td>
                        <td className="financial-value px-4 py-5 text-sm">
                          {formatMultiplier(token.currentMultiplier)}
                        </td>
                        <td className="financial-value px-4 py-5 text-xs text-[#7B828C]">
                          {formatAddress(token.contractAddress)}
                        </td>
                        <td className="financial-value px-4 py-5 text-xs text-[#B8BDC5]">
                          {network?.name ?? "Robinhood"} / {token.chainId}
                        </td>
                        <td
                          className={`financial-value px-4 py-5 text-xs ${
                            token.status === "ASSET_STATUS_ACTIVE"
                              ? "text-[#397BFF]"
                              : "text-[#7B828C]"
                          }`}
                        >
                          {token.status.replace("ASSET_STATUS_", "")}
                        </td>
                        <td className="px-4 py-5">
                          <Link
                            href={`/create?token=${encodeURIComponent(token.symbol)}`}
                            className="inline-flex items-center gap-2 border border-[#397BFF] px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-[#397BFF] transition-colors hover:bg-[#397BFF] hover:text-[#080A0C]"
                          >
                            ADD TO BASKET
                            <IconArrowRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {!loading && !error && displayedTokens.length > 0 ? (
            <div className="mt-6 grid gap-3 md:hidden">
              {displayedTokens.map((token) => {
                const isValidated = validatedSymbolSet.has(token.symbol);

                return (
                  <article
                    key={`${token.chainId}-${token.contractAddress}`}
                    className="alive-ring border border-[#20252C] bg-[#101418] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-sm tracking-wide">{token.symbol}</h2>
                        <p className="mono-label mt-1 text-[9px] text-[#7B828C]">
                          {token.name}
                        </p>
                        {isValidated ? (
                          <p className="mono-label mt-2 text-[9px] text-[#397BFF]">
                            V1 VALIDATED
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="financial-value text-sm">
                          {formatUsd(token.priceUsd)}
                        </p>
                        <p className="financial-value mt-1 text-xs text-[#7B828C]">
                          {formatMultiplier(token.currentMultiplier)}
                        </p>
                      </div>
                    </div>
                    <dl className="mt-5 grid gap-3 border-t border-[#20252C] pt-4">
                      <div>
                        <dt className="mono-label text-[9px]">CONTRACT</dt>
                        <dd className="financial-value mt-1 break-all text-xs text-[#7B828C]">
                          {token.contractAddress}
                        </dd>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="mono-label text-[9px]">NETWORK</dt>
                          <dd className="financial-value mt-1 text-xs">
                            {token.chainId}
                          </dd>
                        </div>
                        <div>
                          <dt className="mono-label text-[9px]">STATUS</dt>
                          <dd className="financial-value mt-1 text-xs text-[#397BFF]">
                            {token.status.replace("ASSET_STATUS_", "")}
                          </dd>
                        </div>
                      </div>
                    </dl>
                    <Link
                      href={`/create?token=${encodeURIComponent(token.symbol)}`}
                      className="mt-5 flex items-center justify-center gap-2 border border-[#397BFF] px-3 py-3 font-mono text-[10px] font-bold tracking-[0.12em] text-[#397BFF] transition-colors hover:bg-[#397BFF] hover:text-[#080A0C]"
                    >
                      ADD TO BASKET
                      <IconArrowRight size={13} />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : null}

          <div className="reveal-on-scroll mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#7B828C]">
            <IconTrendingUp size={13} className="text-[#397BFF]" />
            <span>
              Prices use Robinhood Stock Token data and current multiplier
              metadata.
            </span>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
