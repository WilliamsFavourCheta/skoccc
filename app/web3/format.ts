import type { Address } from "viem";

export function formatAddress(address: Address | undefined) {
  if (!address) return "";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getErrorText(error: unknown) {
  if (!error) return "";

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("user rejected") || message.includes("rejected")) {
      return "Wallet request rejected.";
    }

    if (message.includes("insufficient funds")) {
      return "Insufficient gas or token balance.";
    }

    if (message.includes("allowance") || message.includes("approve")) {
      return "Token approval failed.";
    }

    if (message.includes("tickeralreadyused") || message.includes("ticker already")) {
      return "Ticker already taken. Choose another ticker.";
    }

    if (
      message.includes("network") ||
      message.includes("rpc") ||
      message.includes("fetch failed")
    ) {
      return "Network or RPC request failed.";
    }

    if (message.includes("chain") || message.includes("switch")) {
      return "Switch to the configured Robinhood Chain network.";
    }

    return error.message;
  }

  return "Wallet request failed.";
}
