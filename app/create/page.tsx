"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Address } from "viem";
import { decodeEventLog } from "viem";
import {
  useConnection,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  CompositionBar,
  Header,
  IconArrowRight,
  IconSearch,
} from "../components";
import { basketFactoryAbi, basketVaultAbi } from "../contracts/abis";
import {
  getBasketFactoryAddress,
  getMissingFactoryMessage,
} from "../contracts/addresses";
import { useOfficialStockTokens } from "../hooks/use-stock-tokens";
import { saveBasketMetadata, saveTransactionMetadata } from "../lib/metadata";
import { targetChain } from "../web3/chains";
import { getTransactionUrl } from "../web3/explorer";
import { getErrorText } from "../web3/format";

type BasketAsset = {
  symbol: string;
  name: string;
  tokenAddress: Address;
  priceUsd: number | null;
  weight: number;
  tone: string;
};

type ToastNotice = {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
};

const steps = ["IDENTITY", "COMPOSITION", "REVIEW", "DEPLOY"] as const;
const MAX_BASKET_ASSETS = 10;

function Field({
  label,
  value,
  onChange,
  placeholder,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="mono-label mb-2 block text-[#F1F1EA]">[ {label} ]</span>
      {wide ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full border border-[#20252C] bg-[#080A0C] px-4 py-3 text-sm text-[#F1F1EA] outline-none placeholder:text-[#56606D] focus:border-[#397BFF]"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full border border-[#20252C] bg-[#080A0C] px-4 py-3 text-sm text-[#F1F1EA] outline-none placeholder:text-[#56606D] focus:border-[#397BFF]"
        />
      )}
    </label>
  );
}

function StepRail({ activeStep }: { activeStep: number }) {
  return (
    <div className="overflow-x-auto border-b border-[#20252C] bg-[#080A0C] px-4 sm:px-6">
      <div className="mx-auto grid min-w-[430px] max-w-7xl grid-cols-4 sm:min-w-0">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`border-r border-[#20252C] px-2 py-3 last:border-r-0 sm:px-3 sm:py-4 ${
              index === activeStep ? "bg-[#397BFF] text-[#080A0C]" : ""
            }`}
          >
            <p
              className={`font-mono text-[9px] tracking-[0.12em] sm:text-[10px] ${
                index === activeStep ? "text-[#080A0C]" : "text-[#7B828C]"
              }`}
            >
              0{index + 1}
            </p>
            <p className="mt-1 font-mono text-[9px] font-bold tracking-[0.12em] sm:text-[10px]">
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CreateBasket() {
  const router = useRouter();
  const connection = useConnection();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Frontier Compute");
  const [ticker, setTicker] = useState("FCPU");
  const [description, setDescription] = useState(
    "A concentrated basket of the infrastructure powering the next generation of intelligence.",
  );
  const [query, setQuery] = useState("");
  const [composition, setComposition] = useState<BasketAsset[]>([]);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const processedDeploymentRef = useRef(false);
  const processedTokenPrefillRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    data: officialTokens,
    error: tokenRegistryError,
    loading: tokenRegistryLoading,
  } = useOfficialStockTokens();
  const factoryAddress = getBasketFactoryAddress();
  const missingFactoryMessage = getMissingFactoryMessage();
  const normalizedTicker = ticker.trim().toLowerCase();
  const factoryBaskets = useReadContract({
    address: factoryAddress ?? undefined,
    abi: basketFactoryAbi,
    functionName: "getBaskets",
    query: {
      enabled: Boolean(factoryAddress && normalizedTicker),
    },
  });
  const tickerSymbolReads = useReadContracts({
    contracts: (factoryBaskets.data ?? []).map((address) => ({
      address,
      abi: basketVaultAbi,
      functionName: "symbol" as const,
    })),
    query: {
      enabled: Boolean(normalizedTicker && (factoryBaskets.data?.length ?? 0) > 0),
    },
  });
  const tickerTaken = (tickerSymbolReads.data ?? []).some((read) => {
    const basketSymbol = read.result;

    return (
      typeof basketSymbol === "string" &&
      basketSymbol.trim().toLowerCase() === normalizedTicker
    );
  });
  const tickerAvailabilityLoading =
    Boolean(normalizedTicker) &&
    (factoryBaskets.isLoading ||
      factoryBaskets.isFetching ||
      ((factoryBaskets.data?.length ?? 0) > 0 &&
        (tickerSymbolReads.isLoading || tickerSymbolReads.isFetching)));
  const tickerAvailabilityError =
    factoryBaskets.error ?? tickerSymbolReads.error;
  const weightBps = useMemo(
    () => composition.map((asset) => Math.round(asset.weight * 100)),
    [composition],
  );
  const totalWeightBps = weightBps.reduce((sum, weight) => sum + weight, 0);
  const totalWeight = totalWeightBps / 100;
  const validWeight = totalWeightBps === 10000;
  const hasPositiveWeights =
    composition.length > 0 && weightBps.every((weight) => weight > 0);
  const withinAssetLimit = composition.length <= MAX_BASKET_ASSETS;
  const validComposition = validWeight && hasPositiveWeights && withinAssetLimit;
  const validIdentity = name.trim().length > 0 && ticker.trim().length > 0;
  const connectedToTarget =
    Number(connection.chainId) === Number(targetChain.id);
  const {
    data: deployHash,
    error: deployError,
    isPending: isDeployPending,
    writeContract,
  } = useWriteContract();
  const {
    data: deployReceipt,
    isLoading: isConfirmingDeploy,
    isSuccess: deployConfirmed,
  } = useWaitForTransactionReceipt({
    hash: deployHash,
  });
  const isDeploying = isDeployPending || isConfirmingDeploy;
  const canDeploy =
    Boolean(factoryAddress) &&
    connection.isConnected &&
    connectedToTarget &&
    validComposition &&
    composition.length > 0 &&
    !tickerAvailabilityLoading &&
    !tickerAvailabilityError &&
    !tickerTaken &&
    !isDeploying &&
    !deployConfirmed;
  const deployTransactionUrl = deployHash ? getTransactionUrl(deployHash) : null;
  const deployErrorText = getErrorText(deployError);
  const deployButtonLabel = !factoryAddress
    ? "FACTORY ADDRESS REQUIRED"
    : !connection.isConnected
      ? "CONNECT WALLET TO DEPLOY"
      : !connectedToTarget
        ? "SWITCH NETWORK TO DEPLOY"
        : isDeployPending
          ? "CONFIRM IN WALLET"
          : isConfirmingDeploy
            ? "DEPLOYING BASKET"
            : deployConfirmed
              ? "DEPLOYMENT CONFIRMED"
              : "DEPLOY ON ROBINHOOD CHAIN";
  const continueButtonLabel =
    step === 0
      ? "CONTINUE TO COMPOSITION"
      : step === 1
        ? "CONTINUE TO REVIEW"
        : "CONTINUE TO DEPLOY";
  const continueHint =
    step === 0 && !validIdentity
      ? "ENTER NAME AND TICKER TO CONTINUE"
      : step === 1 && composition.length === 0
        ? "SELECT ASSETS TO CONTINUE"
        : step === 1 && !withinAssetLimit
          ? `REMOVE ASSETS TO STAY WITHIN ${MAX_BASKET_ASSETS} MAX`
          : step === 1 && !hasPositiveWeights
            ? "ASSIGN EACH ASSET A WEIGHT ABOVE 0%"
            : step === 1 && !validWeight
              ? "ADJUST WEIGHTS TO CONTINUE"
              : "ALL CHANGES SAVED LOCALLY";
  const availableTokens =
    composition.length >= MAX_BASKET_ASSETS
      ? []
      : officialTokens.filter(
          (asset) => !composition.some((held) => held.symbol === asset.symbol),
        );
  const searchResults = availableTokens.filter((asset) =>
    `${asset.symbol} ${asset.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  const visibleTokenOptions = query ? searchResults : availableTokens;
  const showTokenOptions =
    !tokenRegistryLoading &&
    !tokenRegistryError &&
    visibleTokenOptions.length > 0;
  const showEmptySearch = query && searchResults.length === 0;
  const showEmptyRegistry =
    !query &&
    !tokenRegistryLoading &&
    !tokenRegistryError &&
    officialTokens.length === 0;
  const showAllTokensSelected =
    !query &&
    !tokenRegistryLoading &&
    !tokenRegistryError &&
    officialTokens.length > 0 &&
    composition.length < MAX_BASKET_ASSETS &&
    availableTokens.length === 0;
  const showMaxAssetsSelected =
    !query &&
    !tokenRegistryLoading &&
    !tokenRegistryError &&
    composition.length >= MAX_BASKET_ASSETS;

  const showToast = useCallback(
    (message: string, tone: ToastNotice["tone"] = "info") => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      setToast({ id: Date.now(), message, tone });
      toastTimeoutRef.current = setTimeout(() => setToast(null), 3800);
    },
    [],
  );

  function addAsset(asset: (typeof officialTokens)[number]) {
    if (composition.length >= MAX_BASKET_ASSETS) {
      showToast(`V1 baskets support up to ${MAX_BASKET_ASSETS} assets.`, "error");
      return;
    }

    setComposition((current) => [
      ...current,
      {
        symbol: asset.symbol,
        name: asset.name,
        tokenAddress: asset.contractAddress,
        priceUsd: asset.priceUsd,
        weight: 0,
        tone: "#2D58A8",
      },
    ]);
    setQuery("");
    showToast(`${asset.symbol} added to basket.`, "success");
  }

  function updateWeight(symbol: string, value: string) {
    setComposition((current) =>
      current.map((asset) =>
        asset.symbol === symbol
          ? { ...asset, weight: Math.max(0, Number(value) || 0) }
          : asset,
      ),
    );
  }

  function removeAsset(symbol: string) {
    setComposition((current) =>
      current.filter((asset) => asset.symbol !== symbol),
    );
    showToast(`${symbol} removed from basket.`, "info");
  }

  function continueFlow() {
    if (step === 0) {
      if (!validIdentity) {
        showToast("Basket name and ticker are required.", "error");
        return;
      }

      if (tickerAvailabilityLoading) {
        showToast("Checking ticker availability.", "info");
        return;
      }

      if (tickerAvailabilityError) {
        showToast("Unable to verify ticker availability. Try again.", "error");
        return;
      }

      if (tickerTaken) {
        showToast("Ticker already created. Choose another ticker.", "error");
        return;
      }

      setStep(1);
      showToast("Identity saved. Choose the underlying assets.", "success");
    }

    if (step === 1) {
      if (tokenRegistryLoading) {
        showToast("Token registry is still loading.", "info");
        return;
      }

      if (tokenRegistryError) {
        showToast(tokenRegistryError, "error");
        return;
      }

      if (composition.length === 0) {
        showToast("Select at least one Stock Token.", "error");
        return;
      }

      if (!withinAssetLimit) {
        showToast(`V1 baskets support up to ${MAX_BASKET_ASSETS} assets.`, "error");
        return;
      }

      if (!hasPositiveWeights) {
        showToast("Every selected token needs a weight above 0%.", "error");
        return;
      }

      if (!validWeight) {
        showToast("Weights must total exactly 100%.", "error");
        return;
      }

      setStep(2);
      showToast("Composition ready for review.", "success");
    }

    if (step === 2) {
      setStep(3);
      showToast("Review locked. Ready to deploy.", "info");
    }
  }

  function deployBasket() {
    if (!factoryAddress) {
      showToast(missingFactoryMessage, "error");
      return;
    }

    if (!connection.address) {
      showToast("Connect wallet to deploy.", "error");
      return;
    }

    if (!connectedToTarget) {
      showToast(`Switch to ${targetChain.name} to deploy.`, "error");
      return;
    }

    if (!validComposition) {
      showToast("Fix basket composition before deploying.", "error");
      return;
    }

    if (tickerAvailabilityLoading) {
      showToast("Checking ticker availability.", "info");
      return;
    }

    if (tickerAvailabilityError) {
      showToast("Unable to verify ticker availability. Try again.", "error");
      return;
    }

    if (tickerTaken) {
      showToast("Ticker already created. Choose another ticker.", "error");
      return;
    }

    if (!canDeploy) return;

    showToast("Confirm deployment in your wallet.", "info");

    writeContract(
      {
        address: factoryAddress,
        abi: basketFactoryAbi,
        functionName: "createBasket",
        args: [
          name.trim(),
          ticker.trim(),
          composition.map((asset) => asset.tokenAddress),
          weightBps,
        ],
      },
      {
        onError: (error) => showToast(getErrorText(error), "error"),
        onSuccess: () => showToast("Transaction submitted.", "success"),
      },
    );
  }

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      processedTokenPrefillRef.current ||
      tokenRegistryLoading ||
      tokenRegistryError ||
      officialTokens.length === 0
    ) {
      return;
    }

    processedTokenPrefillRef.current = true;

    const requestedSymbol = new URLSearchParams(window.location.search)
      .get("token")
      ?.trim()
      .toUpperCase();

    if (!requestedSymbol) return;

    const asset = officialTokens.find((token) => token.symbol === requestedSymbol);

    if (!asset) {
      queueMicrotask(() =>
        showToast(`${requestedSymbol} is not available on this network.`, "error"),
      );
      return;
    }

    queueMicrotask(() => {
      setComposition((current) => {
        if (current.some((held) => held.symbol === asset.symbol)) return current;

        return [
          ...current,
          {
            symbol: asset.symbol,
            name: asset.name,
            tokenAddress: asset.contractAddress,
            priceUsd: asset.priceUsd,
            weight: current.length === 0 ? 100 : 0,
            tone: "#2D58A8",
          },
        ];
      });
      setStep(1);
      showToast(`${asset.symbol} added to basket.`, "success");
    });
  }, [
    officialTokens,
    showToast,
    tokenRegistryError,
    tokenRegistryLoading,
  ]);

  useEffect(() => {
    if (
      !deployConfirmed ||
      !deployReceipt ||
      !deployHash ||
      !connection.address ||
      processedDeploymentRef.current
    ) {
      return;
    }

    const createdLog = deployReceipt.logs
      .map((log) => {
        try {
          return decodeEventLog({
            abi: basketFactoryAbi,
            data: log.data,
            topics: log.topics,
          });
        } catch {
          return null;
        }
      })
      .find((log) => log?.eventName === "BasketCreated");

    const basketAddress = createdLog?.args.basket;

    if (basketAddress && connection.address) {
      processedDeploymentRef.current = true;
      queueMicrotask(() =>
        showToast("Deployment confirmed. Saving basket metadata.", "success"),
      );
      Promise.all([
        saveBasketMetadata({
          chainId: targetChain.id,
          address: basketAddress,
          creatorWallet: connection.address,
          name: name.trim(),
          symbol: ticker.trim(),
          description,
          transactionHash: deployHash,
          assets: composition.map((asset, index) => ({
            symbol: asset.symbol,
            name: asset.name,
            tokenAddress: asset.tokenAddress,
            weightBps: weightBps[index],
            priceUsd: asset.priceUsd ?? undefined,
          })),
        }),
        saveTransactionMetadata({
          chainId: targetChain.id,
          hash: deployHash,
          walletAddress: connection.address,
          basketAddress,
          type: "basket_creation",
          status: "confirmed",
          metadata: {
            name: name.trim(),
            symbol: ticker.trim(),
          },
        }),
      ])
        .then(([basketResult, transactionResult]) => {
          if (!basketResult.ok || !transactionResult.ok) {
            showToast("Basket deployed, but metadata save needs attention.", "error");
          }
        })
        .finally(() => router.push(`/basket/${basketAddress}`));
    }
  }, [
    composition,
    connection.address,
    deployConfirmed,
    deployHash,
    deployReceipt,
    description,
    name,
    router,
    showToast,
    ticker,
    weightBps,
  ]);

  return (
    <div className="min-h-screen bg-[#080A0C] text-[#F1F1EA]">
      <Header activePath="/create" />
      {toast ? (
        <div
          key={toast.id}
          className={`fixed right-4 top-20 z-[60] max-w-sm border bg-[#101418] px-4 py-3 shadow-2xl shadow-black/40 ${
            toast.tone === "error"
              ? "border-red-500/60 text-red-300"
              : toast.tone === "success"
                ? "border-[#397BFF] text-[#397BFF]"
                : "border-[#20252C] text-[#F1F1EA]"
          }`}
          role="status"
        >
          <p className="mono-label text-[10px] leading-relaxed">
            {toast.message}
          </p>
        </div>
      ) : null}
      <StepRail activeStep={step} />
      <main className="relative mx-auto max-w-7xl overflow-x-clip px-4 pb-28 pt-10 sm:px-6 sm:pb-32 sm:pt-12 lg:py-16">
        <div className="technical-grid" aria-hidden="true" />
        <header className="reveal-on-scroll relative z-10 mb-12 flex flex-col justify-between gap-6 border-b border-[#20252C] pb-9 md:flex-row md:items-end">
          <div>
            <p className="mono-label mb-4 text-[#397BFF]">
              FACTORY / NEW_ASSET / 0x7C91
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.06em] text-[#F1F1EA] md:text-6xl">
              Compose your
              <br />
              <span className="text-[#397BFF]">market thesis.</span>
            </h1>
          </div>
          <p className="mono-label max-w-xs leading-relaxed text-[#7B828C]">
            CREATE A TOKENIZED BASKET
            <br />
            BACKED 1:1 BY VERIFIED EQUITIES.
          </p>
        </header>

        {step === 0 ? (
          <section
            className="relative z-10 grid gap-10 lg:grid-cols-[1.35fr_0.65fr]"
            aria-labelledby="identity-heading"
          >
            <div>
              <h2 id="identity-heading" className="mb-2 text-xl font-bold tracking-[-0.03em]">
                01 / Identity
              </h2>
              <p className="mono-label mb-8 text-[#7B828C]">
                Define the public signature of your basket.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <Field
                  label="BASKET NAME"
                  value={name}
                  onChange={setName}
                  placeholder="e.g. Future Systems"
                />
                <Field
                  label="TICKER SYMBOL"
                  value={ticker}
                  onChange={(value) => setTicker(value.toUpperCase().slice(0, 5))}
                  placeholder="e.g. FTRS"
                />
                {normalizedTicker ? (
                  <p
                    className={`mono-label -mt-3 md:col-start-2 ${
                      tickerAvailabilityError
                        ? "text-red-300"
                        : tickerTaken
                          ? "text-red-300"
                          : tickerAvailabilityLoading
                            ? "text-[#7B828C]"
                            : "text-[#397BFF]"
                    }`}
                  >
                    {tickerAvailabilityError
                      ? "TICKER CHECK UNAVAILABLE"
                      : tickerAvailabilityLoading
                        ? "CHECKING TICKER..."
                        : tickerTaken
                          ? "TICKER ALREADY CREATED"
                          : "TICKER AVAILABLE"}
                  </p>
                ) : null}
                <Field
                  wide
                  label="DESCRIPTION"
                  value={description}
                  onChange={setDescription}
                  placeholder="What is the thesis behind this basket?"
                />
              </div>
            </div>
            <aside className="alive-ring border border-[#20252C] bg-[#101418] p-6">
              <p className="mono-label mb-10 text-[#397BFF]">SYSTEM_PARAMETERS</p>
              <div className="space-y-5">
                {[
                  ["STANDARD", "ERC-20"],
                  ["CUSTODY", "ON-CHAIN"],
                  ["SETTLEMENT", "T+0"],
                ].map(([label, value], index) => (
                  <p
                    key={label}
                    className={`flex justify-between ${
                      index < 2 ? "border-b border-[#20252C] pb-4" : ""
                    }`}
                  >
                    <span className="mono-label">{label}</span>
                    <strong className="financial-value text-xs">{value}</strong>
                  </p>
                ))}
              </div>
            </aside>
          </section>
        ) : null}

        {step === 1 ? (
          <section
            className="relative z-10 grid gap-10 lg:grid-cols-[1fr_340px]"
            aria-labelledby="composition-heading"
          >
            <div>
              <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                  <h2 id="composition-heading" className="mb-2 text-xl font-bold">
                    02 / Composition
                  </h2>
                  <p className="mono-label text-[#7B828C]">
                    Select underlying assets and assign their allocation.
                  </p>
                </div>
                <span className="mono-label hidden text-[#397BFF] sm:block">
                  {composition.length.toString().padStart(2, "0")} /{" "}
                  {MAX_BASKET_ASSETS} ASSETS
                </span>
              </div>
              <label className="mb-6 flex items-center gap-3 border border-[#20252C] bg-[#101418] px-4 py-3">
                <IconSearch size={16} className="text-[#7B828C]" />
                <span className="sr-only">Search stocks</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="SEARCH SYMBOL OR COMPANY..."
                  className="w-full bg-transparent font-mono text-xs uppercase tracking-wider text-[#F1F1EA] outline-none placeholder:text-[#56606D]"
                />
              </label>
              {tokenRegistryLoading ? (
                <p className="mono-label mb-6 border border-[#20252C] bg-[#101418] p-4 text-[#7B828C]">
                  LOADING OFFICIAL ROBINHOOD STOCK TOKENS
                </p>
              ) : null}
              {tokenRegistryError ? (
                <p className="mono-label mb-6 border border-red-500/50 bg-[#101418] p-4 text-red-300">
                  {tokenRegistryError}
                </p>
              ) : null}
              {showTokenOptions ? (
                <div className="mb-6 border border-[#20252C] bg-[#101418]">
                  {visibleTokenOptions.map((asset) => (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => addAsset(asset)}
                      className="flex w-full items-center justify-between border-b border-[#20252C] px-4 py-3 text-left last:border-0 hover:bg-[#1A1F26]"
                    >
                      <span>
                        <strong className="financial-value text-sm">
                          {asset.symbol}
                        </strong>
                        <span className="mono-label ml-3 text-[10px]">
                          {asset.name}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        {asset.priceUsd ? (
                          <span className="financial-value text-xs text-[#7B828C]">
                            ${asset.priceUsd.toFixed(2)}
                          </span>
                        ) : null}
                        <IconArrowRight size={16} className="text-[#397BFF]" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {showEmptySearch ? (
                <p className="mono-label mb-6 border border-[#20252C] bg-[#101418] p-4">
                  NO MATCHING ASSETS
                </p>
              ) : null}
              {showEmptyRegistry ? (
                <p className="mono-label mb-6 border border-[#20252C] bg-[#101418] p-4 text-[#7B828C]">
                  NO STOCK TOKENS CONFIGURED FOR THIS NETWORK.
                </p>
              ) : null}
              {showAllTokensSelected ? (
                <p className="mono-label mb-6 border border-[#20252C] bg-[#101418] p-4 text-[#7B828C]">
                  ALL AVAILABLE STOCK TOKENS SELECTED.
                </p>
              ) : null}
              {showMaxAssetsSelected ? (
                <p className="mono-label mb-6 border border-[#20252C] bg-[#101418] p-4 text-[#7B828C]">
                  MAX {MAX_BASKET_ASSETS} ASSETS SELECTED FOR V1.
                </p>
              ) : null}
              <div className="border-t border-[#20252C]">
                {composition.length === 0 ? (
                  <p className="mono-label border-b border-[#20252C] py-6 text-[#7B828C]">
                    SELECT OFFICIAL ROBINHOOD STOCK TOKENS TO CONTINUE.
                  </p>
                ) : null}
                {composition.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="grid grid-cols-[1fr_100px_28px] items-center gap-4 border-b border-[#20252C] py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2 w-2"
                        style={{ backgroundColor: asset.tone }}
                      />
                      <span className="financial-value text-sm font-bold">
                        {asset.symbol}
                      </span>
                      <span className="mono-label hidden text-[10px] sm:inline">
                        {asset.name}
                      </span>
                      {asset.priceUsd ? (
                        <span className="financial-value hidden text-[10px] text-[#7B828C] md:inline">
                          ${asset.priceUsd.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                    <label className="flex items-center border border-[#20252C] bg-[#101418] px-2">
                      <span className="sr-only">Weight for {asset.symbol}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={asset.weight}
                        onChange={(event) =>
                          updateWeight(asset.symbol, event.target.value)
                        }
                        className="financial-value w-full bg-transparent py-2 text-right text-sm outline-none"
                      />
                      <span className="financial-value text-xs text-[#7B828C]">
                        %
                      </span>
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${asset.symbol}`}
                      onClick={() => removeAsset(asset.symbol)}
                      className="text-[#7B828C] hover:text-red-400"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <aside className="alive-ring z-10 h-fit border border-[#20252C] bg-[#101418] p-6 lg:sticky lg:top-24">
              <p className="mono-label mb-4">WEIGHT MANAGEMENT</p>
              <p
                className={`financial-value mb-2 text-4xl font-bold ${
                  validWeight ? "text-[#397BFF]" : "text-[#F1F1EA]"
                }`}
              >
                {totalWeight.toFixed(2)}%
              </p>
              <p className="mono-label mb-7 text-[10px]">
                TOTAL WEIGHT / TARGET 100.00%
              </p>
              <div className="h-1 bg-[#20252C]">
                <div
                  className={`h-full transition-all ${
                    validWeight ? "bg-[#397BFF]" : "bg-[#7B828C]"
                  }`}
                  style={{ width: `${Math.min(totalWeight, 100)}%` }}
                />
              </div>
              <p className="mono-label mt-8 border-t border-[#20252C] pt-5 leading-relaxed">
                IMMUTABLE COMPOSITION
                <br />
                ERC-20 SHARE TOKEN
              </p>
            </aside>
          </section>
        ) : null}

        {step >= 2 ? (
          <section
            className="relative z-10 grid gap-10 lg:grid-cols-[1fr_380px]"
            aria-labelledby="review-heading"
          >
            <div>
              <h2 id="review-heading" className="mb-2 text-xl font-bold">
                03 / Review
              </h2>
              <p className="mono-label mb-8 text-[#7B828C]">
                Confirm the asset before committing it on-chain.
              </p>
              <article className="alive-ring border border-[#20252C] bg-[#101418] p-6 md:p-8">
                <div className="mb-14 flex items-start justify-between">
                  <div>
                    <p className="mono-label mb-3 text-[#397BFF]">
                      BASKET / {ticker || "TICKER"}
                    </p>
                    <h3 className="text-3xl font-black tracking-[-0.05em]">
                      {name || "UNTITLED BASKET"}
                    </h3>
                  </div>
                  <span className="border border-[#20252C] px-2 py-1 font-mono text-[10px] text-[#7B828C]">
                    LIVE PREVIEW
                  </span>
                </div>
                <p className="mb-10 max-w-lg text-sm leading-relaxed text-[#A7ADB5]">
                  {description || "No description provided."}
                </p>
                <CompositionBar
                  assets={composition.map((asset) => ({
                    symbol: asset.symbol,
                    weight: asset.weight,
                    color: asset.tone,
                  }))}
                  showLegend
                />
                <div className="mt-10 grid grid-cols-2 gap-6 border-t border-[#20252C] pt-5">
                  <div>
                    <p className="mono-label mb-2">ASSETS</p>
                    <p className="financial-value text-lg">
                      {composition.length.toString().padStart(2, "0")}
                    </p>
                  </div>
                  <div>
                    <p className="mono-label mb-2">TOTAL WEIGHT</p>
                    <p
                      className={`financial-value text-lg ${
                        validWeight ? "text-[#397BFF]" : "text-red-400"
                      }`}
                    >
                      {totalWeight.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </article>
            </div>
            <aside className="alive-ring h-fit border border-[#397BFF] bg-[#101418] p-6">
              <p className="mono-label mb-4 text-[#397BFF]">DEPLOYMENT GATE</p>
              <h3 className="mb-3 text-xl font-bold">Ready for chain.</h3>
              <p className="mono-label mb-8 leading-relaxed">
                THE ABOVE CONFIGURATION WILL BE MINTED AS AN IMMUTABLE ERC-20
                SHARE TOKEN.
              </p>
              <button
                type="button"
                disabled={!canDeploy}
                onClick={deployBasket}
                className="flex w-full items-center justify-between border border-[#397BFF] bg-[#397BFF] px-4 py-4 text-left text-xs font-bold text-[#080A0C] transition-colors hover:bg-transparent hover:text-[#397BFF] disabled:cursor-not-allowed disabled:border-[#20252C] disabled:bg-[#20252C] disabled:text-[#7B828C]"
              >
                <span>{deployButtonLabel}</span>
                <IconArrowRight size={17} />
              </button>
              {deployHash ? (
                <a
                  href={deployTransactionUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="financial-value mt-4 block break-all text-[10px] text-[#7B828C] hover:text-[#397BFF]"
                >
                  TX {deployHash}
                </a>
              ) : null}
              {!factoryAddress ? (
                <p className="mono-label mt-4 border border-[#20252C] p-3 text-[#7B828C]">
                  {missingFactoryMessage}
                </p>
              ) : null}
              {deployErrorText ? (
                <p className="mono-label mt-4 border border-red-500/50 p-3 text-red-300">
                  {deployErrorText}
                </p>
              ) : null}
            </aside>
          </section>
        ) : null}

        <footer className="sticky bottom-0 z-40 -mx-4 mt-12 flex flex-col-reverse items-stretch justify-between gap-4 border-t border-[#20252C] bg-[#080A0C]/95 px-4 py-4 shadow-2xl shadow-black/50 backdrop-blur-md sm:-mx-6 sm:flex-row sm:items-center sm:px-6 lg:relative lg:mx-0 lg:bg-[#080A0C] lg:px-0 lg:pt-6 lg:shadow-none lg:backdrop-blur-none">
          <p className="mono-label text-[10px]">
            {deployConfirmed
              ? "DEPLOYMENT CONFIRMED / REDIRECTING"
              : deployHash
                ? "TRANSACTION SUBMITTED / AWAITING CONFIRMATION"
                : continueHint}
          </p>
          {step < 3 ? (
            <button
              type="button"
              onClick={continueFlow}
              aria-disabled={
                (step === 0 && !validIdentity) ||
                (step === 1 && !validComposition)
              }
              className={`group flex w-full min-w-0 items-center justify-center gap-3 border px-4 py-3 text-center font-mono text-xs font-bold transition-colors sm:w-auto sm:px-5 ${
                (step === 0 && !validIdentity) ||
                (step === 1 && !validComposition)
                  ? "border-[#20252C] text-[#56606D]"
                  : "border-[#397BFF] text-[#397BFF] hover:bg-[#397BFF] hover:text-[#080A0C]"
              }`}
            >
              <span className="min-w-0 leading-snug">{continueButtonLabel}</span>
              <IconArrowRight
                size={15}
                className="shrink-0 transition-transform group-hover:translate-x-1"
              />
            </button>
          ) : (
            <button
              type="button"
              disabled={!canDeploy}
              onClick={deployBasket}
              className="flex w-full min-w-0 items-center justify-center gap-3 border border-[#397BFF] bg-[#397BFF] px-4 py-3 text-center font-mono text-xs font-bold text-[#080A0C] transition-colors hover:bg-transparent hover:text-[#397BFF] disabled:cursor-not-allowed disabled:border-[#20252C] disabled:bg-[#20252C] disabled:text-[#7B828C] sm:w-auto sm:px-5"
            >
              <span className="min-w-0 leading-snug">{deployButtonLabel}</span>
              <IconArrowRight size={15} className="shrink-0" />
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}
