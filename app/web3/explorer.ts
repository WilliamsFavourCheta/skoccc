import type { Hex } from "viem";
import { getSupportedChain, targetChain, type SupportedChainId } from "./chains";

export function getTransactionUrl(
  hash: Hex,
  chainId: SupportedChainId = targetChain.id,
) {
  const explorerUrl = getSupportedChain(chainId)?.blockExplorers?.default.url;

  if (!explorerUrl) return null;

  return `${explorerUrl}/tx/${hash}`;
}
