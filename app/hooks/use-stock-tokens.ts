"use client";

import { useEffect, useState } from "react";
import type { OfficialStockToken } from "../lib/stock-tokens";
import { targetChain } from "../web3/chains";

type StockTokenState = {
  data: OfficialStockToken[];
  error: string;
  loading: boolean;
};

type UseOfficialStockTokensOptions = {
  includePrices?: boolean;
};

export function useOfficialStockTokens(
  chainId = targetChain.id,
  options: UseOfficialStockTokensOptions = {},
) {
  const includePrices = Boolean(options.includePrices);
  const [state, setState] = useState<StockTokenState>({
    data: [],
    error: "",
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function loadTokens() {
      setState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const params = new URLSearchParams({ chainId: chainId.toString() });

        if (includePrices) params.set("includePrices", "1");

        const response = await fetch(`/api/stock-tokens?${params.toString()}`);
        const payload = (await response.json()) as {
          tokens?: OfficialStockToken[];
          error?: string;
        };

        if (!active) return;

        if (!response.ok) {
          setState({
            data: [],
            error: payload.error ?? "Unable to load official Stock Tokens.",
            loading: false,
          });
          return;
        }

        setState({
          data: payload.tokens ?? [],
          error: "",
          loading: false,
        });
      } catch (error) {
        if (!active) return;

        setState({
          data: [],
          error:
            error instanceof Error
              ? error.message
              : "Unable to load official Stock Tokens.",
          loading: false,
        });
      }
    }

    loadTokens();

    return () => {
      active = false;
    };
  }, [chainId, includePrices]);

  return state;
}
