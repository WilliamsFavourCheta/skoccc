"use client";

import { useMemo, useState } from "react";
import {
  formatUnits,
  isAddress,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import {
  useConnection,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWalletClient,
} from "wagmi";
import {
  CompositionBar,
  Header,
  IconActivity,
  IconArrowRight,
  IconBox,
  IconWallet,
  MetricCard,
} from "../../components";
import { basketVaultAbi, erc20Abi } from "../../contracts/abis";
import { useOfficialStockTokens } from "../../hooks/use-stock-tokens";
import { saveTransactionMetadata } from "../../lib/metadata";
import { targetChain } from "../../web3/chains";
import { getTransactionUrl } from "../../web3/explorer";
import { formatAddress, getErrorText } from "../../web3/format";

const tabs = ["MINT", "REDEEM", "TRANSFER"] as const;
const ZERO = BigInt(0);
const BASIS_POINTS = BigInt(10_000);
const ROUNDING_BUFFER = BigInt(9_999);
const MULTIPLIER_SCALE = parseUnits("1", 18);

function parseShareAmount(value: string) {
  try {
    return parseUnits(value || "0", 18);
  } catch {
    return ZERO;
  }
}

function formatTokenAmount(value: bigint | undefined, decimals = 18) {
  if (value === undefined) return "0.0000";

  return Number(formatUnits(value, decimals)).toLocaleString("en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 4,
  });
}

function formatMultiplier(value: bigint | undefined) {
  if (value === undefined) return "1.0000";

  return Number(formatUnits(value, 18)).toLocaleString("en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 4,
  });
}

function parseUiMultiplier(value: string | undefined) {
  if (!value) return MULTIPLIER_SCALE;

  try {
    return parseUnits(value, 18);
  } catch {
    return MULTIPLIER_SCALE;
  }
}

function toUiAmount(rawAmount: bigint | undefined, multiplier: bigint | undefined) {
  if (rawAmount === undefined) return ZERO;

  return (rawAmount * (multiplier ?? MULTIPLIER_SCALE)) / MULTIPLIER_SCALE;
}

function requiredAmount(shareAmount: bigint, weightBps: number) {
  if (shareAmount === ZERO) return ZERO;

  return (shareAmount * BigInt(weightBps) + ROUNDING_BUFFER) / BASIS_POINTS;
}

export function BasketDetail({ address }: { address: string }) {
  const basketAddress = isAddress(address) ? address : null;
  const connection = useConnection();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [tab, setTab] = useState<(typeof tabs)[number]>("MINT");
  const [amount, setAmount] = useState("1.00");
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: officialTokens } = useOfficialStockTokens();
  const account = connection.address;
  const amountParsed = parseShareAmount(amount);
  const enabled = Boolean(basketAddress);

  const name = useReadContract({
    address: basketAddress ?? undefined,
    abi: basketVaultAbi,
    functionName: "name",
    query: { enabled },
  });
  const symbol = useReadContract({
    address: basketAddress ?? undefined,
    abi: basketVaultAbi,
    functionName: "symbol",
    query: { enabled },
  });
  const creator = useReadContract({
    address: basketAddress ?? undefined,
    abi: basketVaultAbi,
    functionName: "creator",
    query: { enabled },
  });
  const totalSupply = useReadContract({
    address: basketAddress ?? undefined,
    abi: basketVaultAbi,
    functionName: "totalSupply",
    query: { enabled },
  });
  const walletBalance = useReadContract({
    address: basketAddress ?? undefined,
    abi: basketVaultAbi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: enabled && Boolean(account) },
  });
  const compositionRead = useReadContract({
    address: basketAddress ?? undefined,
    abi: basketVaultAbi,
    functionName: "getComposition",
    query: { enabled },
  });
  const reserves = useReadContract({
    address: basketAddress ?? undefined,
    abi: basketVaultAbi,
    functionName: "getReserves",
    query: { enabled },
  });

  const [assets, weights] = useMemo(() => {
    const composition = compositionRead.data;

    if (!composition) return [[], []] as [Address[], number[]];

    return [
      [...composition[0]],
      composition[1].map((weight) => Number(weight)),
    ] as [Address[], number[]];
  }, [compositionRead.data]);

  const tokenMetadata = useMemo(
    () =>
      new Map(
        officialTokens.map((token) => [
          token.contractAddress.toLowerCase(),
          token,
        ]),
      ),
    [officialTokens],
  );

  const requirements = useMemo(
    () => weights.map((weight) => requiredAmount(amountParsed, weight)),
    [amountParsed, weights],
  );
  const reserveValues = (reserves.data ?? []) as bigint[];
  const chainReady = Number(connection.chainId) === Number(targetChain.id);

  const balanceReads = useReadContracts({
    contracts: assets.map((asset) => ({
      address: asset,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: account ? [account] : undefined,
    })),
    query: { enabled: assets.length > 0 && Boolean(account) },
  });
  const allowanceReads = useReadContracts({
    contracts: assets.map((asset) => ({
      address: asset,
      abi: erc20Abi,
      functionName: "allowance",
      args:
        account && basketAddress
          ? [account, basketAddress]
          : undefined,
    })),
    query: { enabled: assets.length > 0 && Boolean(account && basketAddress) },
  });
  const multiplierReads = useReadContracts({
    contracts: assets.map((asset) => ({
      address: asset,
      abi: erc20Abi,
      functionName: "uiMultiplier",
    })),
    query: { enabled: assets.length > 0 },
  });

  const balances = (balanceReads.data ?? []).map(
    (item) => (item.result ?? ZERO) as bigint,
  );
  const allowances = (allowanceReads.data ?? []).map(
    (item) => (item.result ?? ZERO) as bigint,
  );
  const multipliers = assets.map((asset, index) => {
    const onchainMultiplier = multiplierReads.data?.[index]?.result;

    if (typeof onchainMultiplier === "bigint") return onchainMultiplier;

    return parseUiMultiplier(
      tokenMetadata.get(asset.toLowerCase())?.currentMultiplier,
    );
  });
  const missingBalance = requirements.some(
    (required, index) => (balances[index] ?? ZERO) < required,
  );
  const missingApprovals = requirements
    .map((required, index) => ({
      asset: assets[index],
      required,
      allowance: allowances[index] ?? ZERO,
    }))
    .filter((item) => item.asset && item.allowance < item.required);
  const canRunOperation =
    Boolean(walletClient && publicClient && account && basketAddress) &&
    chainReady &&
    amountParsed > ZERO;
  const transactionUrl = txHash ? getTransactionUrl(txHash) : null;
  const readErrorText = getErrorText(
    name.error ??
      symbol.error ??
      creator.error ??
      totalSupply.error ??
      compositionRead.error ??
      reserves.error,
  );

  async function runTransaction() {
    if (
      isSubmitting ||
      !walletClient ||
      !publicClient ||
      !account ||
      !basketAddress
    ) {
      return;
    }

    setError("");
    setTxHash(null);
    setIsSubmitting(true);
    setStatus("PREPARING TRANSACTION");

    try {
      if (!chainReady) {
        setError(`Switch to ${targetChain.name} first.`);
        return;
      }

      if (amountParsed === ZERO) {
        setError("Enter an amount greater than zero.");
        return;
      }

      if (tab === "MINT") {
        if (missingBalance) {
          setError("Insufficient underlying Stock Token balance.");
          return;
        }

        for (const approval of missingApprovals) {
          if (approval.allowance > ZERO) {
            setStatus(`CONFIRM RESET FOR ${formatAddress(approval.asset)}`);
            const resetHash = await walletClient.writeContract({
              account,
              chain: targetChain,
              address: approval.asset,
              abi: erc20Abi,
              functionName: "approve",
              args: [basketAddress, ZERO],
            });
            setTxHash(resetHash);
            setStatus(`CONFIRMING RESET FOR ${formatAddress(approval.asset)}`);
            await publicClient.waitForTransactionReceipt({ hash: resetHash });
          }

          setStatus(`CONFIRM APPROVAL FOR ${formatAddress(approval.asset)}`);
          const approvalHash = await walletClient.writeContract({
            account,
            chain: targetChain,
            address: approval.asset,
            abi: erc20Abi,
            functionName: "approve",
            args: [basketAddress, approval.required],
          });
          setTxHash(approvalHash);
          setStatus(`CONFIRMING APPROVAL FOR ${formatAddress(approval.asset)}`);
          await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        }

        setStatus("CONFIRM MINT IN WALLET");
        const hash = await walletClient.writeContract({
          account,
          chain: targetChain,
          address: basketAddress,
          abi: basketVaultAbi,
          functionName: "mint",
          args: [amountParsed],
        });
        setTxHash(hash);
        setStatus("CONFIRMING MINT ON-CHAIN");
        await publicClient.waitForTransactionReceipt({ hash });
        await saveTransactionMetadata({
          chainId: targetChain.id,
          hash,
          walletAddress: account,
          basketAddress,
          type: "mint",
          status: "confirmed",
          metadata: { amount },
        });
      }

      if (tab === "REDEEM") {
        if ((walletBalance.data ?? ZERO) < amountParsed) {
          setError("Insufficient basket token balance.");
          return;
        }

        setStatus("CONFIRM REDEMPTION IN WALLET");
        const hash = await walletClient.writeContract({
          account,
          chain: targetChain,
          address: basketAddress,
          abi: basketVaultAbi,
          functionName: "redeem",
          args: [amountParsed],
        });
        setTxHash(hash);
        setStatus("CONFIRMING REDEMPTION ON-CHAIN");
        await publicClient.waitForTransactionReceipt({ hash });
        await saveTransactionMetadata({
          chainId: targetChain.id,
          hash,
          walletAddress: account,
          basketAddress,
          type: "redeem",
          status: "confirmed",
          metadata: { amount },
        });
      }

      if (tab === "TRANSFER") {
        if (!isAddress(recipient)) {
          setError("Enter a valid recipient address.");
          return;
        }

        if ((walletBalance.data ?? ZERO) < amountParsed) {
          setError("Insufficient basket token balance.");
          return;
        }

        setStatus("CONFIRM TRANSFER IN WALLET");
        const hash = await walletClient.writeContract({
          account,
          chain: targetChain,
          address: basketAddress,
          abi: basketVaultAbi,
          functionName: "transfer",
          args: [recipient, amountParsed],
        });
        setTxHash(hash);
        setStatus("CONFIRMING TRANSFER ON-CHAIN");
        await publicClient.waitForTransactionReceipt({ hash });
        await saveTransactionMetadata({
          chainId: targetChain.id,
          hash,
          walletAddress: account,
          basketAddress,
          type: "transfer",
          status: "confirmed",
          metadata: { amount, recipient },
        });
      }

      setStatus("CONFIRMED");
      await Promise.all([
        walletBalance.refetch(),
        reserves.refetch(),
        totalSupply.refetch(),
        balanceReads.refetch(),
        allowanceReads.refetch(),
        multiplierReads.refetch(),
      ]);
    } catch (caught) {
      setStatus("");
      setError(getErrorText(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!basketAddress) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#080A0C] text-[#F1F1EA]">
        <Header />
        <div className="technical-grid" aria-hidden="true" />
        <section className="reveal-on-scroll relative z-10 mx-auto max-w-7xl px-6 py-16">
          <p className="mono-label text-red-300">INVALID BASKET ADDRESS</p>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080A0C] text-[#F1F1EA]">
      <Header />
      <div className="technical-grid" aria-hidden="true" />
      <section className="relative z-10 mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
        <header className="reveal-on-scroll mb-8 flex flex-col justify-between gap-6 border-b border-[#20252C] pb-8 md:flex-row md:items-end">
          <div>
            <p className="mono-label mb-3 text-[#397BFF]">
              [ BASKET / {formatAddress(basketAddress)} ]
            </p>
            <h1 className="text-4xl font-black tracking-[-0.06em] sm:text-6xl">
              {name.data ?? "Loading Basket"}
            </h1>
            <p className="financial-value mt-3 text-sm text-[#7B828C]">
              {symbol.data ?? "..."} / CREATOR {formatAddress(creator.data)}
            </p>
          </div>
          <div className="border border-[#20252C] bg-[#101418] px-4 py-3">
            <p className="mono-label mb-1 text-[9px]">CONNECTED BALANCE</p>
            <p className="financial-value text-xl">
              {formatTokenAmount(walletBalance.data)} {symbol.data ?? ""}
            </p>
          </div>
        </header>

        <section className="reveal-on-scroll reveal-delay-1 grid grid-cols-2 border-x border-b border-[#20252C] sm:grid-cols-4">
          <MetricCard
            label="TOTAL SUPPLY"
            value={formatTokenAmount(totalSupply.data)}
          />
          <MetricCard label="ASSETS" value={assets.length.toString()} />
          <MetricCard label="NETWORK" value={targetChain.id.toString()} />
          <MetricCard
            label="WALLET"
            value={connection.isConnected ? "ON" : "OFF"}
            trend={connection.isConnected ? "up" : "neutral"}
          />
        </section>

        <a
          href="#basket-actions"
          className="mt-4 flex items-center justify-between border border-[#397BFF] px-4 py-3 font-mono text-xs font-bold text-[#397BFF] md:hidden"
        >
          MINT THIS BASKET <IconArrowRight size={15} />
        </a>

        {readErrorText ? (
          <p className="mono-label mt-6 border border-red-500/50 bg-[#101418] p-4 text-red-300">
            {readErrorText}
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <article className="alive-ring reveal-on-scroll terminal-panel !p-0">
            <header className="flex items-center justify-between border-b border-[#20252C] px-5 py-4">
              <h2 className="mono-label text-[#F1F1EA]">[ COMPOSITION ]</h2>
              <IconBox size={16} className="text-[#397BFF]" />
            </header>
            <div className="p-5">
              <CompositionBar
                assets={assets.map((asset, index) => ({
                  symbol:
                    tokenMetadata.get(asset.toLowerCase())?.symbol ??
                    formatAddress(asset),
                  weight: weights[index] / 100,
                  color: ["#397BFF", "#6A98FF", "#AFC5FF", "#2D58A8"][index % 4],
                }))}
                showLegend
              />
            </div>
            <div className="divide-y divide-[#20252C] border-t border-[#20252C] md:hidden">
              {assets.map((asset, index) => {
                const metadata = tokenMetadata.get(asset.toLowerCase());

                return (
                  <article key={asset} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="financial-value text-sm text-[#F1F1EA]">
                          {metadata?.symbol ?? formatAddress(asset)}
                        </p>
                        <p className="mono-label mt-1 break-all text-[9px] text-[#7B828C]">
                          {metadata?.name ?? asset}
                        </p>
                      </div>
                      <p className="financial-value shrink-0 text-xs text-[#397BFF]">
                        {(weights[index] / 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#20252C] pt-3">
                      <div>
                        <p className="mono-label text-[9px]">MINT REQUIREMENT</p>
                        <p className="financial-value mt-1 text-xs">
                          {formatTokenAmount(requirements[index])}
                        </p>
                      </div>
                      <div>
                        <p className="mono-label text-[9px]">YOUR WALLET</p>
                        <p className="financial-value mt-1 text-xs">
                          {formatTokenAmount(balances[index])}
                        </p>
                      </div>
                      <div>
                        <p className="mono-label text-[9px]">VAULT RESERVE</p>
                        <p className="financial-value mt-1 text-xs">
                          {formatTokenAmount(reserveValues[index])}
                        </p>
                      </div>
                      <div>
                        <p className="mono-label text-[9px]">UI EXPOSURE</p>
                        <p className="financial-value mt-1 text-xs text-[#397BFF]">
                          {formatTokenAmount(
                            toUiAmount(reserveValues[index], multipliers[index]),
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto border-t border-[#20252C] md:block">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#20252C] font-mono text-[10px] uppercase text-[#7B828C]">
                    {[
                      "ASSET",
                      "WEIGHT",
                      "REQUIRED RAW",
                      "WALLET RAW",
                      "RESERVE RAW",
                      "UI EXPOSURE",
                    ].map((heading) => (
                      <th key={heading} className="px-5 py-3 font-normal">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset, index) => {
                    const metadata = tokenMetadata.get(asset.toLowerCase());

                    return (
                      <tr key={asset} className="border-b border-[#20252C] last:border-0">
                        <td className="px-5 py-4">
                          <p className="financial-value text-sm">
                            {metadata?.symbol ?? formatAddress(asset)}
                          </p>
                          <p className="mono-label mt-1 text-[9px]">
                            {metadata?.name ?? asset}
                          </p>
                        </td>
                        <td className="financial-value px-5 py-4 text-xs">
                          {(weights[index] / 100).toFixed(2)}%
                        </td>
                        <td className="financial-value px-5 py-4 text-xs">
                          {formatTokenAmount(requirements[index])}
                        </td>
                        <td className="financial-value px-5 py-4 text-xs">
                          {formatTokenAmount(balances[index])}
                        </td>
                        <td className="financial-value px-5 py-4 text-xs">
                          {formatTokenAmount(reserveValues[index])}
                        </td>
                        <td className="px-5 py-4">
                          <p className="financial-value text-xs">
                            {formatTokenAmount(
                              toUiAmount(reserveValues[index], multipliers[index]),
                            )}
                          </p>
                          <p className="mono-label mt-1 text-[9px]">
                            X {formatMultiplier(multipliers[index])}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <aside
            id="basket-actions"
            className="alive-ring reveal-on-scroll reveal-delay-1 terminal-panel !p-0 lg:self-start"
          >
            <header className="border-b border-[#20252C] px-5 py-5">
              <p className="mono-label text-[#397BFF]">[ ACTION PANEL ]</p>
              <h2 className="mt-2 text-xl font-bold">
                {symbol.data ?? "BASKET"} OPERATIONS
              </h2>
            </header>
            <nav className="grid grid-cols-3 border-b border-[#20252C]">
              {tabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  disabled={isSubmitting}
                  className={`border-r border-[#20252C] px-1 py-4 font-mono text-[10px] transition-colors last:border-r-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                    tab === item
                      ? "bg-[#397BFF] text-[#080A0C]"
                      : "text-[#7B828C] hover:bg-[#151A20] hover:text-[#F1F1EA]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>
            <div className="space-y-5 p-5">
              <label htmlFor="basket-amount" className="mono-label text-[#F1F1EA]">
                [ {tab === "MINT" ? "MINT AMOUNT" : "BASKET AMOUNT"} ]
              </label>
              <div className="flex border border-[#20252C] bg-[#0B0E12] focus-within:border-[#397BFF]">
                <input
                  id="basket-amount"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  disabled={isSubmitting}
                  inputMode="decimal"
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-lg outline-none disabled:cursor-not-allowed disabled:text-[#7B828C]"
                />
                <span className="flex items-center border-l border-[#20252C] px-3 font-mono text-xs text-[#7B828C]">
                  {symbol.data ?? "BASKET"}
                </span>
              </div>

              {tab === "TRANSFER" ? (
                <input
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="0x recipient"
                  className="w-full border border-[#20252C] bg-[#0B0E12] px-4 py-3 font-mono text-xs outline-none placeholder:text-[#7B828C] focus:border-[#397BFF] disabled:cursor-not-allowed disabled:text-[#7B828C]"
                />
              ) : null}

              <div className="border-y border-[#20252C] py-4">
                <p className="mono-label mb-3 text-[#F1F1EA]">
                  [ {tab === "MINT" ? "YOU PROVIDE" : "YOU RECEIVE"} ]
                </p>
                <div className="space-y-3">
                  {assets.map((asset, index) => {
                    const metadata = tokenMetadata.get(asset.toLowerCase());

                    return (
                      <div
                        key={asset}
                        className="flex items-start justify-between gap-3 font-mono text-xs"
                      >
                        <span className="text-[#7B828C]">
                          <span className="block">
                            {formatTokenAmount(requirements[index])}{" "}
                            {metadata?.symbol ?? formatAddress(asset)}
                          </span>
                          <span className="mono-label mt-1 block text-[9px]">
                            UI EXPOSURE{" "}
                            {formatTokenAmount(
                              toUiAmount(requirements[index], multipliers[index]),
                            )}{" "}
                            / X {formatMultiplier(multipliers[index])}
                          </span>
                        </span>
                        <span className="text-[#F1F1EA]">
                          {tab === "MINT" ? "REQUIRED" : "ESTIMATED"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!connection.isConnected ? (
                <p className="mono-label border border-[#20252C] p-3 text-[#7B828C]">
                  CONNECT WALLET FROM NAVBAR
                </p>
              ) : !chainReady ? (
                <p className="mono-label border border-red-500/50 p-3 text-red-300">
                  SWITCH TO {targetChain.name.toUpperCase()}
                </p>
              ) : null}

              <button
                type="button"
                disabled={
                  isSubmitting ||
                  !canRunOperation ||
                  (tab === "MINT" && missingBalance)
                }
                onClick={runTransaction}
                className="flex w-full items-center justify-center gap-2 bg-[#397BFF] px-4 py-3 font-mono text-xs font-bold text-[#080A0C] transition-colors hover:bg-[#6B99FF] disabled:cursor-not-allowed disabled:bg-[#20252C] disabled:text-[#7B828C]"
              >
                {isSubmitting ? (
                  <IconActivity size={15} className="animate-spin" />
                ) : (
                  <IconWallet size={15} />
                )}
                <span>
                  {isSubmitting
                    ? status || "PROCESSING"
                    : tab === "MINT" && missingApprovals.length > 0
                      ? "APPROVE & MINT"
                      : tab === "REDEEM"
                        ? "REDEEM"
                        : tab === "TRANSFER"
                          ? "TRANSFER"
                          : "MINT"}
                </span>
              </button>

              {status ? (
                <p className="mono-label flex items-center gap-2 text-[#397BFF]" aria-live="polite">
                  {isSubmitting ? <IconActivity size={12} className="animate-spin" /> : null}
                  {status}
                </p>
              ) : null}
              {txHash ? (
                <a
                  href={transactionUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="financial-value block break-all text-[10px] text-[#7B828C] hover:text-[#397BFF]"
                >
                  TX {txHash} <IconArrowRight className="inline h-3 w-3" />
                </a>
              ) : null}
              {error ? (
                <p className="mono-label border border-red-500/50 p-3 text-red-300">
                  {error}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
