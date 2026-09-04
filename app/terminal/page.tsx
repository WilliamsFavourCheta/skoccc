"use client";

import { useMemo, useState } from "react";
import {
  Header,
  IconActivity,
  IconArrowRight,
  IconBox,
  IconWallet,
  MetricCard,
} from "../components";
import { vaultReserves } from "../data";

const prices = [
  112.4, 113.1, 112.8, 114.6, 114.1, 115.9, 116.4, 115.8, 117.2, 118.6, 117.9,
  119.8, 120.4, 121.3, 120.9, 122.7, 123.5, 122.8, 124.1, 125.8, 124.9, 126.6,
  127.3, 128.42,
];
const timeLabels = ["09:30", "11:00", "12:30", "14:00", "15:30", "16:00"];
const tabs = ["OVERVIEW", "MINT", "REDEEM", "TRANSFER"] as const;

export default function TerminalView() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("OVERVIEW");
  const [amount, setAmount] = useState("1.00");
  const [pair, setPair] = useState("AIX / USD");
  const numericAmount = Number.parseFloat(amount) || 0;
  const estimatedValue = useMemo(
    () =>
      (numericAmount * 128.42).toLocaleString("en-US", {
        currency: "USD",
        style: "currency",
      }),
    [numericAmount],
  );
  const chartPoints = prices
    .map((price, index) => `${(index / (prices.length - 1)) * 100},${100 - ((price - 110) / 20) * 100}`)
    .join(" ");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080A0C] text-[#F1F1EA]">
      <Header activePath="/terminal" />
      <div className="technical-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="reveal-on-scroll flex flex-col justify-between gap-4 border-b border-[#20252C] pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="mono-label mb-2 text-[#397BFF]">
              [ MARKET TERMINAL ]
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
                SKOCCC / TERMINAL / AIX
              </h1>
              <span className="font-mono text-xs text-[#7B828C]">
                AI INFRASTRUCTURE
              </span>
            </div>
          </div>
          <label className="flex min-w-[170px] items-center gap-2 border border-[#20252C] bg-[#101418] px-3 py-2 font-mono text-xs text-[#F1F1EA]">
            <span className="sr-only">Select market</span>
            <select
              value={pair}
              onChange={(event) => setPair(event.target.value)}
              className="w-full appearance-none bg-transparent outline-none"
            >
              {["AIX / USD", "AIX / ETH", "AIX / BTC"].map((item) => (
                <option key={item} className="bg-[#101418]" value={item}>
                  {item}
                </option>
              ))}
            </select>
            <IconArrowRight size={14} />
          </label>
        </section>

        <section
          aria-label="AIX performance"
          className="reveal-on-scroll reveal-delay-1 grid grid-cols-2 border-x border-b border-[#20252C] sm:grid-cols-4"
        >
          <MetricCard label="NAV" value="$128.42" />
          <MetricCard label="24H" value="+2.84%" trend="up" />
          <MetricCard label="TVL" value="$6.21M" />
          <MetricCard label="BACKING" value="100%" subValue="VERIFIED" trend="up" />
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(340px,1fr)]">
          <section className="min-w-0 space-y-5">
            <article className="alive-ring reveal-on-scroll terminal-panel !p-0">
              <header className="flex flex-col gap-3 border-b border-[#20252C] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="mono-label text-[#F1F1EA]">
                    [ AIX / NAV PERFORMANCE ]
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-[#7B828C]">
                    INTRADAY // ROBINHOOD_CHAIN // USD
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-[#397BFF]">
                  <IconActivity size={12} />
                  <span>LIVE FEED</span>
                </div>
              </header>
              <div className="p-5">
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <p className="financial-value text-3xl font-bold">$128.42</p>
                    <p className="mono-label mt-1 text-[#397BFF]">
                      + $3.56 / +2.84%
                    </p>
                  </div>
                  <p className="mono-label hidden sm:block">
                    LAST UPDATE 16:00:04 UTC
                  </p>
                </div>
                <div className="h-[260px] w-full min-w-0 border border-[#20252C] bg-[#0B0E12] p-4">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="h-full w-full"
                    role="img"
                    aria-label="AIX net asset value rising from 112 dollars to 128 dollars during the trading day"
                  >
                    <g stroke="#20252C" strokeWidth="0.25">
                      {[10, 30, 50, 70, 90].map((y) => (
                        <line key={`h-${y}`} x1="0" y1={y} x2="100" y2={y} />
                      ))}
                      {[20, 40, 60, 80].map((x) => (
                        <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="100" />
                      ))}
                    </g>
                    <polyline
                      points={chartPoints}
                      fill="none"
                      stroke="#397BFF"
                      strokeWidth="0.8"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1="0"
                      y1="7.9"
                      x2="100"
                      y2="7.9"
                      stroke="#397BFF"
                      strokeDasharray="1.5 1.5"
                      strokeWidth="0.3"
                    />
                  </svg>
                </div>
                <div className="mt-3 flex justify-between px-1 font-mono text-[10px] text-[#7B828C]">
                  {timeLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </article>

            <article className="alive-ring reveal-on-scroll reveal-delay-1 terminal-panel !p-0">
              <header className="flex items-center justify-between border-b border-[#20252C] px-5 py-4">
                <h2 className="mono-label text-[#F1F1EA]">[ VAULT RESERVES ]</h2>
                <span className="font-mono text-[10px] text-[#397BFF]">
                  CUSTODY RATIO 1:1
                </span>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#20252C] font-mono text-[10px] uppercase text-[#7B828C]">
                      {["ASSET", "SHARES", "MARKET PRICE", "VALUE (USD)", "WEIGHT"].map(
                        (heading) => (
                          <th
                            key={heading}
                            className={`px-5 py-3 font-normal ${
                              heading === "WEIGHT" ? "text-right" : ""
                            }`}
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {vaultReserves.map((asset) => (
                      <tr
                        key={asset.symbol}
                        className="border-b border-[#20252C] last:border-0 hover:bg-[#151A20]"
                      >
                        <th scope="row" className="px-5 py-4 font-mono font-normal">
                          <span className="block text-sm font-bold text-[#F1F1EA]">
                            {asset.symbol}
                          </span>
                          <span className="mt-1 block text-[10px] text-[#7B828C]">
                            {asset.name}
                          </span>
                        </th>
                        <td className="px-5 py-4 font-mono text-xs">
                          {asset.shares}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">
                          {asset.price}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">
                          {asset.value}
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-xs text-[#397BFF]">
                          {asset.weight}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="flex flex-wrap items-center gap-2 border-t border-[#20252C] px-5 py-3 font-mono text-[10px] text-[#7B828C]">
                <IconBox size={13} className="text-[#397BFF]" />
                <span>[ CUSTODY SMART CONTRACT ]</span>
                <a
                  href="#contract"
                  className="ml-auto flex items-center gap-1 text-[#397BFF] hover:underline"
                >
                  0x7F...A91C <IconArrowRight size={11} />
                </a>
              </footer>
            </article>
          </section>

          <aside className="alive-ring reveal-on-scroll reveal-delay-2 terminal-panel !p-0 lg:self-start">
            <header className="border-b border-[#20252C] px-5 py-5">
              <p className="mono-label text-[#397BFF]">[ ACTION PANEL ]</p>
              <h2 className="mt-2 text-xl font-bold">AIX OPERATIONS</h2>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#7B828C]">
                EXECUTE AGAINST THE AIX INDEX BASKET.
              </p>
            </header>
            <nav
              aria-label="AIX operations"
              className="grid grid-cols-4 border-b border-[#20252C]"
            >
              {tabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`border-r border-[#20252C] px-1 py-4 font-mono text-[10px] transition-colors last:border-r-0 ${
                    tab === item
                      ? "bg-[#397BFF] text-[#080A0C]"
                      : "text-[#7B828C] hover:bg-[#151A20] hover:text-[#F1F1EA]"
                  }`}
                  aria-pressed={tab === item}
                >
                  {item}
                </button>
              ))}
            </nav>
            <div className="p-5">
              {(tab === "MINT" || tab === "REDEEM") && (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="aix-amount" className="mono-label text-[#F1F1EA]">
                      [ {tab === "MINT" ? "AIX AMOUNT" : "AIX BURN AMOUNT"} ]
                    </label>
                    <div className="mt-2 flex border border-[#20252C] bg-[#0B0E12] focus-within:border-[#397BFF]">
                      <input
                        id="aix-amount"
                        value={amount}
                        onChange={(event) =>
                          setAmount(event.target.value.replace(/[^0-9.]/g, ""))
                        }
                        inputMode="decimal"
                        className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-lg outline-none"
                      />
                      <span className="flex items-center border-l border-[#20252C] px-3 font-mono text-xs text-[#7B828C]">
                        AIX
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-[10px] text-[#7B828C]">
                      <span>WALLET BALANCE</span>
                      <a href="/portfolio" className="text-[#397BFF] hover:text-[#F1F1EA]">
                        VIEW IN PORTFOLIO
                      </a>
                    </div>
                  </div>
                  <div className="border-y border-[#20252C] py-4">
                    <p className="mono-label mb-3 text-[#F1F1EA]">
                      [ {tab === "MINT" ? "YOU PROVIDE" : "YOU RECEIVE"} ]
                    </p>
                    <div className="space-y-3">
                      {vaultReserves.map((asset, index) => (
                        <div
                          key={asset.symbol}
                          className="flex items-center justify-between font-mono text-xs"
                        >
                          <span className="text-[#7B828C]">
                            {numericAmount === 0
                              ? "0.000"
                              : (numericAmount * [0.222, 0.096, 0.058][index]).toFixed(3)}{" "}
                            {asset.symbol}
                          </span>
                          <span className="text-[#F1F1EA]">
                            {tab === "MINT" ? "REQUIRED" : "RECEIVED"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-[#7B828C]">EST. VALUE</span>
                    <span>{estimatedValue}</span>
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 bg-[#397BFF] px-4 py-3 font-mono text-xs font-bold text-[#080A0C] transition-colors hover:bg-[#6B99FF] focus:outline-none focus:ring-2 focus:ring-[#397BFF]"
                  >
                    <IconWallet size={15} />
                    <span>{tab === "MINT" ? "MINT AIX" : "BURN & REDEEM"}</span>
                  </button>
                </div>
              )}
              {tab === "OVERVIEW" && (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 border border-[#20252C] bg-[#0B0E12] p-4">
                    <IconActivity
                      size={16}
                      className="mt-0.5 shrink-0 text-[#397BFF]"
                    />
                    <p className="font-mono text-xs leading-relaxed text-[#7B828C]">
                      AIX tracks a basket of leading AI infrastructure equities.
                      Each token is backed 1:1 by the assets held in the custody
                      vault.
                    </p>
                  </div>
                  <dl className="space-y-4 font-mono text-xs">
                    {[
                      ["TOTAL SUPPLY", "48,392.00 AIX"],
                      ["REBALANCE", "QUARTERLY"],
                      ["FEE", "0.25%"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <dt className="text-[#7B828C]">{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <button
                    type="button"
                    onClick={() => setTab("MINT")}
                    className="flex w-full items-center justify-center gap-2 border border-[#397BFF] px-4 py-3 font-mono text-xs text-[#397BFF] hover:bg-[#397BFF]/10"
                  >
                    <IconWallet size={14} />
                    <span>START AN OPERATION</span>
                  </button>
                </div>
              )}
              {tab === "TRANSFER" && (
                <div className="space-y-5">
                  <div className="border border-[#20252C] bg-[#0B0E12] p-4">
                    <p className="mono-label text-[#F1F1EA]">
                      [ PEER TRANSFER ]
                    </p>
                    <p className="mt-3 font-mono text-xs leading-relaxed text-[#7B828C]">
                      Move AIX directly to a verified wallet address. Transfers
                      do not alter the underlying vault composition.
                    </p>
                  </div>
                  <label htmlFor="recipient" className="mono-label text-[#F1F1EA]">
                    [ RECIPIENT ADDRESS ]
                  </label>
                  <input
                    id="recipient"
                    placeholder="0x..."
                    className="w-full border border-[#20252C] bg-[#0B0E12] px-4 py-3 font-mono text-xs outline-none placeholder:text-[#7B828C] focus:border-[#397BFF]"
                  />
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 border border-[#397BFF] px-4 py-3 font-mono text-xs text-[#397BFF] hover:bg-[#397BFF]/10"
                  >
                    <IconArrowRight size={14} />
                    <span>TRANSFER AIX</span>
                  </button>
                </div>
              )}
            </div>
            <footer className="border-t border-[#20252C] px-5 py-4 font-mono text-[10px] text-[#7B828C]">
              [ ALL ACTIONS REQUIRE WALLET SIGNATURE ]
            </footer>
          </aside>
        </div>
      </div>
    </main>
  );
}
