import { defineChain } from "viem";
import { robinhood } from "viem/chains";

export { robinhood };

export const ROBINHOOD_MAINNET_CHAIN_ID = 4663;
export const ROBINHOOD_TESTNET_CHAIN_ID = 46630;
export const ROBINHOOD_TESTNET_RPC_URL =
  "https://rpc.testnet.chain.robinhood.com";

export const robinhoodTestnet = defineChain({
  id: ROBINHOOD_TESTNET_CHAIN_ID,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [ROBINHOOD_TESTNET_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://explorer.testnet.chain.robinhood.com",
      apiUrl: "https://explorer.testnet.chain.robinhood.com/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
    },
  },
  testnet: true,
});

export const supportedChains = [robinhood, robinhoodTestnet] as const;

export type SupportedChain = (typeof supportedChains)[number];
export type SupportedChainId = SupportedChain["id"];

export function getSupportedChain(chainId: number | undefined) {
  return supportedChains.find((chain) => chain.id === chainId);
}

export function getTargetChain(): SupportedChain {
  const configuredChainId = Number(
    process.env.NEXT_PUBLIC_SKOCCC_TARGET_CHAIN_ID,
  );

  return getSupportedChain(configuredChainId) ?? robinhood;
}

export const targetChain = getTargetChain();

export function isSupportedChainId(
  chainId: number | undefined,
): chainId is SupportedChainId {
  return supportedChains.some((chain) => chain.id === chainId);
}
