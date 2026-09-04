import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhood, robinhoodTestnet } from "./chains";

const mainnetRpcUrl =
  process.env.NEXT_PUBLIC_ROBINHOOD_MAINNET_RPC_URL ??
  robinhood.rpcUrls.default.http[0];
const testnetRpcUrl =
  process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL ??
  robinhoodTestnet.rpcUrls.default.http[0];

export const wagmiConfig = createConfig({
  chains: [robinhood, robinhoodTestnet],
  connectors: [injected()],
  ssr: true,
  transports: {
    [robinhood.id]: http(mainnetRpcUrl),
    [robinhoodTestnet.id]: http(testnetRpcUrl),
  },
});
