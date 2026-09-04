import "./scripts/load-env";
import "@nomicfoundation/hardhat-toolbox";
import type { HardhatUserConfig } from "hardhat/config";

const accounts = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY]
  : [];
const missingMainnetRpcUrl = "http://127.0.0.1:8545";
const robinhoodMainnetRpcUrl = process.env.ROBINHOOD_MAINNET_RPC_URL?.trim();
const robinhoodTestnetRpcUrl = process.env.ROBINHOOD_TESTNET_RPC_URL?.trim();

const networks: HardhatUserConfig["networks"] = {};

networks.robinhood = {
  url: robinhoodMainnetRpcUrl || missingMainnetRpcUrl,
  chainId: 4663,
  accounts,
};

if (robinhoodTestnetRpcUrl) {
  networks.robinhoodTestnet = {
    url: robinhoodTestnetRpcUrl,
    chainId: 46630,
    accounts,
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks,
};

export default config;
