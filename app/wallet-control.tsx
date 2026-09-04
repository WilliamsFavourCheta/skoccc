"use client";

import { useEffect, useState } from "react";
import {
  useChainId,
  useConnection,
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { targetChain } from "./web3/chains";
import { formatAddress, getErrorText } from "./web3/format";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

function getInjectedEthereumProvider() {
  if (typeof window === "undefined") return null;

  return (window as Window & { ethereum?: EthereumProvider }).ethereum ?? null;
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;

  return (error as { code?: unknown }).code;
}

function isUnknownChainError(error: unknown) {
  const code = getErrorCode(error);
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return code === 4902 || message.includes("unrecognized chain");
}

async function addTargetChainToWallet() {
  const ethereum = getInjectedEthereumProvider();

  if (!ethereum) {
    throw new Error("No injected wallet provider found.");
  }

  await ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: `0x${targetChain.id.toString(16)}`,
        chainName: targetChain.name,
        nativeCurrency: targetChain.nativeCurrency,
        rpcUrls: [...targetChain.rpcUrls.default.http],
        blockExplorerUrls: targetChain.blockExplorers?.default.url
          ? [targetChain.blockExplorers.default.url]
          : undefined,
      },
    ],
  });
}

export function WalletControl() {
  const connection = useConnection();
  const activeChainId = useChainId();
  const connectors = useConnectors();
  const [manualSwitchError, setManualSwitchError] = useState<Error | null>(null);
  const {
    mutate: connect,
    isPending: isConnectingWallet,
    error: connectError,
  } = useConnect();
  const {
    mutate: switchChain,
    isPending: isSwitchingChain,
    error: switchError,
  } = useSwitchChain();
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnect();
  const connector = connectors[0];
  const connectedChainId = Number(connection.chainId ?? activeChainId);
  const configuredTargetChainId = Number(targetChain.id);
  const isWrongNetwork =
    connection.isConnected &&
    (!Number.isFinite(connectedChainId) ||
      connectedChainId !== configuredTargetChainId);
  const connectedToTarget = connection.isConnected && !isWrongNetwork;
  const isBusy =
    connection.isConnecting ||
    connection.isReconnecting ||
    isConnectingWallet ||
    isSwitchingChain ||
    isDisconnecting;
  const errorText = getErrorText(
    manualSwitchError ?? connectError ?? switchError,
  );

  useEffect(() => {
    console.log("connected chain id", connectedChainId);
    console.log("configured target chain id", configuredTargetChainId);
    console.log("isWrongNetwork", isWrongNetwork);
  }, [connectedChainId, configuredTargetChainId, isWrongNetwork]);

  function switchToTargetChain() {
    setManualSwitchError(null);
    switchChain(
      { chainId: targetChain.id },
      {
        onError: async (error) => {
          if (!isUnknownChainError(error)) {
            setManualSwitchError(error);
            return;
          }

          try {
            await addTargetChainToWallet();
            switchChain({ chainId: targetChain.id });
          } catch (addChainError) {
            setManualSwitchError(
              addChainError instanceof Error
                ? addChainError
                : new Error("Unable to add Robinhood Chain to wallet."),
            );
          }
        },
      },
    );
  }

  function handleWalletAction() {
    if (connection.isConnected && isWrongNetwork) {
      switchToTargetChain();
      return;
    }

    if (connection.isConnected) {
      disconnect();
      return;
    }

    if (connector) {
      setManualSwitchError(null);
      connect({ connector });
    }
  }

  const label = (() => {
    if (isSwitchingChain) return "SWITCHING_NETWORK";
    if (connection.isReconnecting) return "RESTORING_WALLET";
    if (isConnectingWallet || connection.isConnecting) return "CONNECTING";
    if (connection.isConnected && !connectedToTarget) return "SWITCH_NETWORK";
    if (connection.isConnected) return formatAddress(connection.address);
    if (!connector) return "NO_WALLET_FOUND";
    return "CONNECT_WALLET";
  })();

  return (
    <div className="relative flex items-center gap-3">
      <div className="hidden items-center gap-2 rounded-full border border-[#20252C] bg-[#101418] px-3 py-1 sm:flex">
        <div
          className={`h-1.5 w-1.5 rounded-full ${
            connection.isConnected && connectedToTarget
              ? "bg-[#397BFF]"
              : "bg-[#7B828C]"
          }`}
        />
        <span className="mono-label text-[10px]">
          {connection.isConnected && !connectedToTarget
            ? "WRONG_NETWORK"
            : targetChain.name.replaceAll(" ", "_").toUpperCase()}
        </span>
      </div>
      <button
        type="button"
        disabled={isBusy || !connector}
        onClick={handleWalletAction}
        title={
          connection.isConnected && connectedToTarget
            ? "Disconnect wallet"
            : undefined
        }
        className="flex min-h-8 items-center gap-2 border border-[#397BFF] bg-[#397BFF]/10 px-4 py-1.5 text-xs font-bold uppercase text-[#397BFF] transition-all hover:bg-[#397BFF] hover:text-[#080A0C] disabled:cursor-not-allowed disabled:border-[#20252C] disabled:bg-[#101418] disabled:text-[#7B828C]"
      >
        <span className="mono-label !text-current">{label}</span>
      </button>
      {errorText ? (
        <p className="absolute right-0 top-[calc(100%+0.45rem)] w-64 border border-red-500/50 bg-[#101418] px-3 py-2 font-mono text-[10px] uppercase leading-snug text-red-300 shadow-xl">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
