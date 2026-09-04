export type AssetWeight = {
  symbol: string;
  weight: number;
  color?: string;
};

export type Market = {
  id: string;
  name: string;
  ticker: string;
  category: "TECH" | "AI" | "SEMICONDUCTORS";
  icon: string;
  iconTone: string;
  assets: AssetWeight[];
  nav: string;
  change: number;
  supply: string;
  tvl: number;
  creator: string;
};

export const markets: Market[] = [
  {
    id: "ai-frontier",
    name: "AI FRONTIER",
    ticker: "AIF",
    category: "AI",
    icon: "*",
    iconTone: "#397BFF",
    assets: [
      { symbol: "NVDA", weight: 42, color: "#397BFF" },
      { symbol: "MSFT", weight: 28, color: "#2D58A8" },
      { symbol: "AMD", weight: 18, color: "#1F3F78" },
      { symbol: "GOOG", weight: 12, color: "#14274B" },
    ],
    nav: "$184.92",
    change: 3.84,
    supply: "2.84M",
    tvl: 52400000,
    creator: "0x7A...91F2",
  },
  {
    id: "chipmakers",
    name: "CHIPMAKERS",
    ticker: "CHIP",
    category: "SEMICONDUCTORS",
    icon: "<>",
    iconTone: "#8EAFFF",
    assets: [
      { symbol: "TSM", weight: 38, color: "#397BFF" },
      { symbol: "NVDA", weight: 32, color: "#2D58A8" },
      { symbol: "ASML", weight: 20, color: "#1F3F78" },
      { symbol: "AVGO", weight: 10, color: "#14274B" },
    ],
    nav: "$241.08",
    change: 2.17,
    supply: "1.12M",
    tvl: 38900000,
    creator: "0xB4...2C08",
  },
  {
    id: "tech-core",
    name: "TECH CORE",
    ticker: "TCORE",
    category: "TECH",
    icon: "#",
    iconTone: "#D2DEFF",
    assets: [
      { symbol: "AAPL", weight: 30, color: "#397BFF" },
      { symbol: "MSFT", weight: 26, color: "#2D58A8" },
      { symbol: "AMZN", weight: 24, color: "#1F3F78" },
      { symbol: "META", weight: 20, color: "#14274B" },
    ],
    nav: "$156.44",
    change: 0.86,
    supply: "4.08M",
    tvl: 31200000,
    creator: "0x2E...A442",
  },
  {
    id: "cloud-infra",
    name: "CLOUD INFRA",
    ticker: "CINF",
    category: "TECH",
    icon: "[]",
    iconTone: "#739BFF",
    assets: [
      { symbol: "AMZN", weight: 35, color: "#397BFF" },
      { symbol: "ORCL", weight: 25, color: "#2D58A8" },
      { symbol: "MSFT", weight: 25, color: "#1F3F78" },
      { symbol: "CRM", weight: 15, color: "#14274B" },
    ],
    nav: "$98.73",
    change: -0.42,
    supply: "890K",
    tvl: 18700000,
    creator: "0xC1...F004",
  },
  {
    id: "robotics",
    name: "ROBOTICS & AUTOMATION",
    ticker: "ROBO",
    category: "AI",
    icon: "+",
    iconTone: "#397BFF",
    assets: [
      { symbol: "NVDA", weight: 30, color: "#397BFF" },
      { symbol: "ISRG", weight: 25, color: "#2D58A8" },
      { symbol: "TER", weight: 25, color: "#1F3F78" },
      { symbol: "ABB", weight: 20, color: "#14274B" },
    ],
    nav: "$76.15",
    change: 1.29,
    supply: "2.01M",
    tvl: 14600000,
    creator: "0x5D...8B17",
  },
  {
    id: "semicap",
    name: "SEMI CAP 10",
    ticker: "SC10",
    category: "SEMICONDUCTORS",
    icon: "##",
    iconTone: "#A7BAE8",
    assets: [
      { symbol: "ASML", weight: 34, color: "#397BFF" },
      { symbol: "AMAT", weight: 26, color: "#2D58A8" },
      { symbol: "LRCX", weight: 22, color: "#1F3F78" },
      { symbol: "KLAC", weight: 18, color: "#14274B" },
    ],
    nav: "$132.61",
    change: -1.08,
    supply: "744K",
    tvl: 9800000,
    creator: "0x91...D0AE",
  },
];

export const vaultReserves = [
  {
    symbol: "NVDA",
    name: "NVIDIA CORP.",
    shares: "4,892.12",
    price: "$184.27",
    value: "$901,652.95",
    weight: "38.24%",
  },
  {
    symbol: "MSFT",
    name: "MICROSOFT CORP.",
    shares: "2,104.88",
    price: "$507.62",
    value: "$1,068,211.95",
    weight: "45.31%",
  },
  {
    symbol: "GOOGL",
    name: "ALPHABET INC. CL A",
    shares: "1,276.40",
    price: "$318.67",
    value: "$406,739.23",
    weight: "16.45%",
  },
];

export const availableAssets = [
  { symbol: "NVDA", name: "NVIDIA CORP.", tone: "#397BFF" },
  { symbol: "MSFT", name: "MICROSOFT CORP.", tone: "#6A98FF" },
  { symbol: "GOOGL", name: "ALPHABET INC. CL A", tone: "#AFC5FF" },
  { symbol: "AMD", name: "ADVANCED MICRO DEVICES", tone: "#2D58A8" },
  { symbol: "ASML", name: "ASML HOLDING", tone: "#1F3F78" },
  { symbol: "TSM", name: "TAIWAN SEMICONDUCTOR", tone: "#14274B" },
];

export const starterComposition = [
  { symbol: "NVDA", name: "NVIDIA CORP.", weight: 40, tone: "#397BFF" },
  { symbol: "MSFT", name: "MICROSOFT CORP.", weight: 35, tone: "#6A98FF" },
  { symbol: "GOOGL", name: "ALPHABET INC. CL A", weight: 25, tone: "#AFC5FF" },
];
