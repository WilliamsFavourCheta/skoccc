import type { Abi } from "viem";

export const basketFactoryAbi = [
  {
    type: "function",
    name: "createBasket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name_", type: "string" },
      { name: "symbol_", type: "string" },
      { name: "assets_", type: "address[]" },
      { name: "weightsBps_", type: "uint16[]" },
    ],
    outputs: [{ name: "basket", type: "address" }],
  },
  {
    type: "function",
    name: "getBaskets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getBasketByTicker",
    stateMutability: "view",
    inputs: [{ name: "symbol_", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "error",
    name: "TickerAlreadyUsed",
    inputs: [
      { name: "ticker", type: "string" },
      { name: "basket", type: "address" },
    ],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isBasket",
    stateMutability: "view",
    inputs: [{ name: "basket", type: "address" }],
    outputs: [{ name: "created", type: "bool" }],
  },
  {
    type: "function",
    name: "pauseCreation",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "unpauseCreation",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "setBasketMintingPaused",
    stateMutability: "nonpayable",
    inputs: [
      { name: "basket", type: "address" },
      { name: "paused", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "BasketCreated",
    inputs: [
      { name: "basket", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "assets", type: "address[]", indexed: false },
      { name: "weightsBps", type: "uint16[]", indexed: false },
    ],
  },
] as const satisfies Abi;

export const basketVaultAbi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "creator",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "emergencyAdmin",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "mintingPaused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getComposition",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "assets", type: "address[]" },
      { name: "weightsBps", type: "uint16[]" },
    ],
  },
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "reserves", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "requiredUnderlyingAmount",
    stateMutability: "view",
    inputs: [
      { name: "shareAmount", type: "uint256" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [{ name: "shareAmount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [{ name: "shareAmount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "uiMultiplier",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;
