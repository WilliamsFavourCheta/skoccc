import type { Address } from "viem";
import { isAddress } from "viem";
import { targetChain, type SupportedChainId } from "../web3/chains";

const basketFactoryAddresses: Record<SupportedChainId, string | undefined> = {
  4663: process.env.NEXT_PUBLIC_BASKET_FACTORY_ADDRESS_4663,
  46630: process.env.NEXT_PUBLIC_BASKET_FACTORY_ADDRESS_46630,
};

export function getBasketFactoryAddress(
  chainId: SupportedChainId = targetChain.id,
): Address | null {
  const address = basketFactoryAddresses[chainId];

  if (!address || !isAddress(address)) return null;

  return address;
}

export function getMissingFactoryMessage(chainId: SupportedChainId = targetChain.id) {
  return `Set NEXT_PUBLIC_BASKET_FACTORY_ADDRESS_${chainId} for ${chainId}.`;
}
