"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { ScrollAnimator } from "./scroll-animator";
import { wagmiConfig } from "./web3/config";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ScrollAnimator />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
