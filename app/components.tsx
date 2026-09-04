import Link from "next/link";
import type { SVGProps } from "react";
import type { AssetWeight } from "./data";
import { WalletControl } from "./wallet-control";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const navItems = [
  { name: "TERMINAL", path: "/terminal" },
  { name: "MARKETS", path: "/markets" },
  { name: "CREATE", path: "/create" },
  { name: "PORTFOLIO", path: "/portfolio" },
];

function IconBase({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </IconBase>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </IconBase>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m21 21-4.34-4.34" />
      <circle cx="11" cy="11" r="8" />
    </IconBase>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </IconBase>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </IconBase>
  );
}

export function IconBox(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </IconBase>
  );
}

export function IconActivity(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </IconBase>
  );
}

export function IconTrendingUp(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </IconBase>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </IconBase>
  );
}

export function Header({ activePath = "/" }: { activePath?: string }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#20252C] bg-[#080A0C]/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tighter text-[#F1F1EA]">
              SKO<span className="text-[#397BFF]">CCC</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`mono-label relative flex h-16 items-center transition-colors hover:text-[#397BFF] ${
                  activePath === item.path ? "text-[#397BFF]" : ""
                }`}
              >
                {item.name}
                {activePath === item.path ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#397BFF]" />
                ) : null}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <WalletControl />
          <details className="group relative md:hidden">
            <summary
              aria-label="Open navigation menu"
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center border border-[#20252C] bg-[#101418] text-[#F1F1EA] transition-colors hover:border-[#397BFF] hover:text-[#397BFF] [&::-webkit-details-marker]:hidden"
            >
              <IconMenu size={18} />
            </summary>
            <nav className="absolute right-0 top-[calc(100%+0.75rem)] min-w-44 border border-[#20252C] bg-[#080A0C] shadow-2xl shadow-black/40">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`mono-label flex items-center justify-between border-b border-[#20252C] px-4 py-3 text-[10px] transition-colors last:border-b-0 hover:bg-[#101418] hover:text-[#397BFF] ${
                    activePath === item.path ? "!text-[#397BFF]" : ""
                  }`}
                >
                  {item.name}
                  {activePath === item.path ? (
                    <span className="h-1.5 w-1.5 bg-[#397BFF]" />
                  ) : null}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="w-full border-t border-[#20252C] bg-[#080A0C] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 space-y-4 md:col-span-2">
            <div className="text-xl font-bold tracking-tighter text-[#F1F1EA]">
              SKO<span className="text-[#397BFF]">CCC</span>
            </div>
            <p className="mono-label max-w-xs text-[10px] leading-relaxed">
              ON-CHAIN ASSET COMPOSITION ENGINE FOR ROBINHOOD CHAIN STOCK
              TOKENS. BASKET STATE IS READ FROM THE CONFIGURED NETWORK.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="mono-label text-xs font-bold text-[#F1F1EA]">
              [ PROTOCOL ]
            </h4>
            {[
              "DOCUMENTATION",
              "GOVERNANCE",
              "SMART_CONTRACTS",
              "SECURITY_AUDITS",
            ].map((item) => (
              <a
                key={item}
                href="#"
                className="mono-label text-[10px] transition-colors hover:text-[#397BFF]"
              >
                {item}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="mono-label text-xs font-bold text-[#F1F1EA]">
              [ COMMUNITY ]
            </h4>
            {["X / TWITTER", "DISCORD", "GITHUB", "MEDIUM"].map((item) => (
              <a
                key={item}
                href="#"
                className="mono-label text-[10px] transition-colors hover:text-[#397BFF]"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start justify-between gap-4 border-t border-[#20252C] pt-8 md:flex-row md:items-center">
          <div className="mono-label max-w-2xl text-[9px] uppercase leading-tight text-[#7B828C]">
            DISCLAIMER: SKOCCC IS A DECENTRALIZED PROTOCOL. TOKENIZED ASSETS
            CARRY SIGNIFICANT RISK. NOT INVESTMENT ADVICE. SUBJECT TO LOCAL
            REGULATORY RESTRICTIONS. STOCKS ARE HELD IN CUSTODIAL VAULTS
            VERIFIED ON-CHAIN.
          </div>
          <div className="mono-label text-[10px] text-[#7B828C]">
            &copy; 2026 SKOCCC_SYSTEMS_INC
          </div>
        </div>
      </div>
    </footer>
  );
}

export function CompositionBar({
  assets,
  showLegend = false,
}: {
  assets: AssetWeight[];
  showLegend?: boolean;
}) {
  const colors = ["#397BFF", "#2D58A8", "#1F3F78", "#14274B", "#0C172E"];
  const sorted = [...assets].sort((a, b) => b.weight - a.weight);

  return (
    <div className="w-full space-y-3">
      <div className="flex h-2 w-full overflow-hidden rounded-none border border-[#20252C] bg-[#101418]">
        {sorted.map((asset, index) => (
          <div
            key={asset.symbol}
            className="h-full border-r border-[#080A0C] transition-all duration-500 last:border-r-0"
            style={{
              width: `${asset.weight}%`,
              backgroundColor: asset.color || colors[index % colors.length],
            }}
            title={`${asset.symbol}: ${asset.weight}%`}
          />
        ))}
      </div>
      {showLegend ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {sorted.map((asset, index) => (
            <div key={asset.symbol} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2"
                style={{
                  backgroundColor: asset.color || colors[index % colors.length],
                }}
              />
              <span className="mono-label text-[10px] text-[#7B828C]">
                {asset.symbol}
              </span>
              <span className="financial-value text-[10px] font-bold text-[#F1F1EA]">
                {asset.weight.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type MarketTapeItem = {
  symbol: string;
  price: string | null;
  status?: string;
};

export function MarketTape({
  items,
  isScrolling = true,
}: {
  items: MarketTapeItem[];
  isScrolling?: boolean;
}) {
  const shown = isScrolling ? [...items, ...items] : items;

  return (
    <div className="relative w-full select-none overflow-hidden border-y border-[#20252C] bg-[#080A0C] py-2">
      <div
        className={`flex whitespace-nowrap ${
          isScrolling ? "animate-scroll" : "justify-around"
        }`}
        style={{ animationDuration: "30s" }}
      >
        {shown.map((item, index) => (
          <div
            key={`${item.symbol}-${index}`}
            className="flex items-center gap-2 border-r border-[#20252C] px-8 last:border-r-0"
          >
            <span className="mono-label font-bold text-[#F1F1EA]">
              {item.symbol}
            </span>
            <span className="financial-value text-sm text-[#F1F1EA]">
              {item.price ? `$${item.price}` : "PRICE UNAVAILABLE"}
            </span>
            {item.status ? (
              <span className="financial-value text-xs text-[#397BFF]">
                {item.status}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {isScrolling ? (
        <>
          <div className="absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-[#080A0C] to-transparent" />
          <div className="absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-[#080A0C] to-transparent" />
        </>
      ) : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
}: {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="alive-ring group relative flex flex-col gap-2 overflow-hidden border border-[#20252C] bg-[#101418] p-4">
      <div className="absolute right-0 top-0 h-4 w-4 border-r border-t border-transparent transition-colors duration-300 group-hover:border-[#397BFF]" />
      <div className="mono-label text-[10px]">[ {label.toUpperCase()} ]</div>
      <div className="flex items-baseline gap-2">
        <div className="financial-value text-2xl font-bold text-[#F1F1EA]">
          {value}
        </div>
        {subValue ? (
          <div
            className={`financial-value text-xs font-medium ${
              trend === "up"
                ? "text-[#397BFF]"
                : trend === "down"
                  ? "text-red-500"
                  : "text-[#7B828C]"
            }`}
          >
            {trend === "up" ? "^" : trend === "down" ? "v" : ""} {subValue}
          </div>
        ) : null}
      </div>
      <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-[#20252C] to-transparent" />
    </div>
  );
}

export function formatTvl(value: number) {
  return value >= 1000000
    ? `$${(value / 1000000).toFixed(1)}M`
    : `$${(value / 1000).toFixed(0)}K`;
}
