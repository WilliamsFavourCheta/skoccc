import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "SKOCCC",
  description: "Asset composition engine for tokenized market baskets.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.skoccc.com",
  ),
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "SKOCCC | Asset Composition Engine",
    description: "Create and manage transparent, on-chain Stock Token baskets.",
    siteName: "SKOCCC",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SKOCCC | Asset Composition Engine",
    description: "Create and manage transparent, on-chain Stock Token baskets.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
