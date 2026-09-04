import {
  CompositionBar,
  Footer,
  Header,
  IconActivity,
  IconArrowDown,
  IconArrowRight,
  IconBox,
  MarketTape,
  MetricCard,
} from "./components";
import { aixAssets, landingMarkets } from "./data";

const mechanism = [
  {
    number: "01",
    title: "COMPOSE",
    copy: "Select the assets that express your conviction. Set the weights. Publish the thesis.",
    Icon: IconBox,
  },
  {
    number: "02",
    title: "MINT",
    copy: "Deposit the underlying tokens into a fully transparent vault and mint your basket.",
    Icon: IconActivity,
  },
  {
    number: "03",
    title: "REDEEM",
    copy: "Burn one basket token to withdraw its proportional share. No permission required.",
    Icon: IconArrowDown,
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080A0C] text-[#F1F1EA]">
      <div className="technical-grid" aria-hidden="true" />
      <Header activePath="/" />
      <main className="relative z-10">
        <section className="reveal-on-scroll border-b border-[#20252C] px-6 pb-0 pt-20 sm:pt-28 lg:px-12 lg:pt-36">
          <div className="mx-auto max-w-7xl">
            <div className="mono-label mb-10 flex items-center justify-between text-[#7B828C]">
              <span>PROTOCOL / 001</span>
              <span className="hidden sm:inline">
                ASSET COMPOSITION ENGINE / ONLINE
              </span>
              <span className="flex items-center">
                SCROLL TO EXPLORE{" "}
                <IconArrowDown className="ml-1 inline h-3 w-3 text-[#397BFF]" />
              </span>
            </div>
            <div className="relative flex min-h-[390px] items-center border-y border-[#20252C] py-20 sm:min-h-[480px] lg:min-h-[560px]">
              <div
                className="pointer-events-none absolute left-[-10%] right-[-10%] top-1/2 h-px rotate-[-9deg] bg-[#397BFF]"
                aria-hidden="true"
              />
              <div className="relative z-10 w-full">
                <p className="mono-label mb-5 text-[#397BFF]">
                  THE MARKET IS A MEDIUM
                </p>
                <h1 className="max-w-6xl text-[clamp(4.7rem,16vw,14rem)] font-black leading-[0.78] tracking-[-0.09em] text-[#F1F1EA]">
                  SKO<span className="text-[#397BFF]">CCC</span>
                </h1>
                <div className="mt-12 flex flex-col justify-between gap-8 border-t border-[#20252C] pt-6 sm:flex-row">
                  <p className="max-w-2xl text-xl font-bold uppercase leading-tight tracking-[-0.04em] sm:text-3xl">
                    BUILD THE BASKET.
                    <br />
                    TRADE THE THESIS.
                    <br />
                    REDEEM THE STOCKS.
                  </p>
                  <p className="mono-label max-w-xs leading-relaxed text-[#7B828C]">
                    A permissionless protocol for turning a point of view into
                    a liquid, composable asset.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MarketTape />

        <section className="reveal-on-scroll mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-36">
          <div className="mb-14 flex items-start justify-between border-b border-[#20252C] pb-6">
            <div>
              <span className="mono-label text-[#397BFF]">SECTION 01</span>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                ONE TOKEN.
                <br />
                AN ENTIRE THESIS.
              </h2>
            </div>
            <span className="mono-label hidden text-[#7B828C] sm:block">
              COMPOSABLE / TRANSPARENT / LIQUID
            </span>
          </div>
          <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-24">
            <div className="flex flex-col justify-between gap-12">
              <div>
                <p className="max-w-lg text-2xl font-medium leading-tight text-[#F1F1EA]">
                  The vault does the boring work. You bring the insight.
                </p>
                <p className="mt-6 max-w-md leading-relaxed text-[#7B828C]">
                  SKOCCC baskets package multiple assets into a single on-chain
                  token. Every token is backed 1:1 by the underlying
                  composition, held in a verifiable vault.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6 border-t border-[#20252C] pt-6">
                <div>
                  <p className="mono-label">01 / BACKED</p>
                  <p className="mt-2 font-mono text-lg">1:1 COLLATERAL</p>
                </div>
                <div>
                  <p className="mono-label">02 / ACCESS</p>
                  <p className="mt-2 font-mono text-lg">24 / 7 / GLOBAL</p>
                </div>
              </div>
            </div>
            <article className="alive-ring reveal-on-scroll reveal-delay-1 border border-[#20252C] bg-[#101418] p-6 sm:p-8">
              <div className="flex items-start justify-between border-b border-[#20252C] pb-6">
                <div>
                  <p className="mono-label text-[#397BFF]">LIVE BASKET / 001</p>
                  <h3 className="mt-2 text-4xl font-black tracking-[-0.06em]">
                    $AIX
                  </h3>
                  <p className="mono-label mt-1">AI INFRASTRUCTURE INDEX</p>
                </div>
                <span className="mono-label border border-[#397BFF] px-2 py-1 !text-[#397BFF]">
                  MINTABLE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-8 py-8">
                <div>
                  <p className="mono-label">NAV</p>
                  <p className="financial-value mt-2 text-3xl">$128.42</p>
                </div>
                <div>
                  <p className="mono-label">24H CHANGE</p>
                  <p className="financial-value mt-2 text-3xl text-[#397BFF]">
                    +2.84%
                  </p>
                </div>
              </div>
              <CompositionBar assets={aixAssets} showLegend />
              <button className="mt-8 flex w-full items-center justify-between border border-[#397BFF] px-4 py-3 font-mono text-xs uppercase text-[#397BFF] transition-colors hover:bg-[#397BFF] hover:text-[#080A0C]">
                VIEW BASKET <IconArrowRight className="h-4 w-4" />
              </button>
            </article>
          </div>
        </section>

        <section className="reveal-on-scroll border-y border-[#20252C] bg-[#0B0E11]/95 px-6 py-24 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14">
              <span className="mono-label text-[#397BFF]">
                SECTION 02 / THE MECHANISM
              </span>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                HOW IT WORKS
              </h2>
            </div>
            <div className="grid border-l border-t border-[#20252C] md:grid-cols-3">
              {mechanism.map(({ number, title, copy, Icon }) => (
                <article
                  key={number}
                  className="reveal-on-scroll alive-ring group min-h-64 border-b border-r border-[#20252C] p-6 transition-colors hover:bg-[#101418] sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#397BFF]">{number}</span>
                    <Icon className="h-5 w-5 text-[#7B828C] transition-colors group-hover:text-[#397BFF]" />
                  </div>
                  <h3 className="mt-20 text-2xl font-black tracking-[-0.04em]">
                    {title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[#7B828C]">
                    {copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-36">
          <div className="mb-10 flex items-end justify-between border-b border-[#20252C] pb-6">
            <div>
              <span className="mono-label text-[#397BFF]">
                SECTION 03 / DISCOVERY
              </span>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                LIVE MARKETS
              </h2>
            </div>
            <a
              href="/markets"
              className="mono-label hidden items-center gap-2 text-[#397BFF] sm:flex"
            >
              OPEN EXPLORER <IconArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="overflow-x-auto border border-[#20252C] bg-[#101418]">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="mono-label border-b border-[#20252C]">
                  {[
                    "MARKET",
                    "DESCRIPTION",
                    "NAV",
                    "24H",
                    "SUPPLY",
                    "STATUS",
                  ].map((heading) => (
                    <th key={heading} className="p-4">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {landingMarkets.map((market) => (
                  <tr
                    key={market.market}
                    className="border-b border-[#20252C] last:border-0 hover:bg-[#151A20]"
                  >
                    <td className="p-4 font-mono font-bold text-[#F1F1EA]">
                      {market.market}
                    </td>
                    <td className="mono-label p-4 !text-[#7B828C]">
                      {market.name}
                    </td>
                    <td className="financial-value p-4">{market.nav}</td>
                    <td
                      className={`financial-value p-4 ${
                        market.change.startsWith("+")
                          ? "text-[#397BFF]"
                          : "text-[#FF5555]"
                      }`}
                    >
                      {market.change}
                    </td>
                    <td className="financial-value p-4 text-[#7B828C]">
                      {market.supply}
                    </td>
                    <td className="p-4">
                      <span
                        className={`mono-label ${
                          market.status === "LIVE"
                            ? "text-[#397BFF]"
                            : "text-[#7B828C]"
                        }`}
                      >
                        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-current" />
                        {market.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="reveal-on-scroll border-y border-[#20252C] px-6 py-24 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 flex items-start justify-between">
              <div>
                <span className="mono-label text-[#397BFF]">
                  SECTION 05 / SETTLEMENT
                </span>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                  THE VAULT IS THE
                  <br />
                  SOURCE OF TRUTH.
                </h2>
              </div>
              <IconBox className="hidden h-10 w-10 text-[#397BFF] sm:block" />
            </div>
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1.1fr_auto_1fr]">
              <div className="reveal-on-scroll reveal-delay-1 border border-[#20252C] bg-[#080A0C]/80 p-6">
                <p className="mono-label">INPUT / UNDERLYING</p>
                <p className="mt-4 font-mono text-xl">NVDA / MSFT / GOOGL</p>
                <p className="mono-label mt-3 text-[#7B828C]">
                  WEIGHTED DEPOSIT
                </p>
              </div>
              <IconArrowRight className="hidden text-[#397BFF] md:block" />
              <div className="alive-ring reveal-on-scroll reveal-delay-2 border border-[#397BFF] bg-[#101418] p-8 text-center">
                <IconBox className="mx-auto h-7 w-7 text-[#397BFF]" />
                <p className="mt-4 font-mono text-lg">SKOCCC VAULT</p>
                <p className="mono-label mt-2 text-[#397BFF]">
                  VERIFIED ON-CHAIN
                </p>
              </div>
              <IconArrowRight className="hidden text-[#397BFF] md:block" />
              <div className="reveal-on-scroll reveal-delay-3 border border-[#20252C] bg-[#080A0C]/80 p-6">
                <p className="mono-label">OUTPUT / BASKET</p>
                <p className="mt-4 font-mono text-xl text-[#397BFF]">
                  $AIX TOKEN
                </p>
                <p className="mono-label mt-3 text-[#7B828C]">
                  LIQUID / REDEEMABLE
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-36">
          <div className="mb-8 flex items-center gap-3">
            <IconActivity className="h-4 w-4 text-[#397BFF]" />
            <span className="mono-label text-[#397BFF]">
              SECTION 07 / NETWORK STATE
            </span>
          </div>
          <div className="alive-ring border border-[#20252C] bg-[#101418] p-5 sm:p-8">
            <div className="mb-8 flex items-center justify-between border-b border-[#20252C] pb-5">
              <p className="font-mono text-sm text-[#7B828C]">
                &gt; SYSTEM_METRICS --LIVE
              </p>
              <span className="mono-label text-[#397BFF]">
                * BLOCK 18,420,991
              </span>
            </div>
            <div className="grid gap-px bg-[#20252C] md:grid-cols-3">
              <MetricCard
                label="TOTAL VALUE LOCKED"
                value="$24.8M"
                subValue="+12.4%"
                trend="up"
              />
              <MetricCard
                label="TOTAL MINTED"
                value="184,209"
                subValue="+8.2%"
                trend="up"
              />
              <MetricCard
                label="BASKETS CREATED"
                value="1,204"
                subValue="ALL TIME"
                trend="neutral"
              />
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll border-t border-[#20252C] px-6 py-28 sm:py-40 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <p className="mono-label mb-8 text-[#397BFF]">
              THE NEXT MOVE IS YOURS.
            </p>
            <h2 className="max-w-6xl text-[clamp(3.5rem,9vw,9rem)] font-black leading-[0.84] tracking-[-0.09em]">
              YOUR THESIS
              <br />
              SHOULDN&apos;T NEED
              <br />
              <span className="text-[#397BFF]">PERMISSION.</span>
            </h2>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <a
                href="/create"
                className="flex items-center justify-center gap-4 bg-[#397BFF] px-6 py-4 font-mono text-sm font-bold text-[#080A0C] transition-colors hover:bg-[#F1F1EA]"
              >
                CREATE MARKET <IconArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/terminal"
                className="flex items-center justify-center gap-4 border border-[#397BFF] px-6 py-4 font-mono text-sm font-bold text-[#397BFF] transition-colors hover:bg-[#397BFF] hover:text-[#080A0C]"
              >
                ENTER TERMINAL <IconArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
