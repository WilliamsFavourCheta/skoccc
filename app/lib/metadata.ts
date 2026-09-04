import type { Address, Hex } from "viem";
import { getSupabaseBrowserClient } from "./supabase";

export type BasketMetadataAsset = {
  symbol: string;
  name: string;
  tokenAddress: Address;
  weightBps: number;
  priceUsd?: number;
  metadata?: Record<string, unknown>;
};

export type BasketMetadataInput = {
  chainId: number;
  address: Address;
  creatorWallet: Address;
  name: string;
  symbol: string;
  description?: string;
  transactionHash?: Hex;
  assets: BasketMetadataAsset[];
};

export type TransactionMetadataInput = {
  chainId: number;
  hash: Hex;
  walletAddress: Address;
  basketAddress?: Address;
  type: "basket_creation" | "mint" | "redeem" | "transfer";
  status: "pending" | "confirmed" | "failed";
  metadata?: Record<string, unknown>;
};

export async function saveBasketMetadata(input: BasketMetadataInput) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      ok: false as const,
      reason: "Supabase is not configured.",
    };
  }

  const { data: basket, error: basketError } = await supabase
    .from("baskets")
    .insert({
      chain_id: input.chainId,
      address: input.address,
      creator_wallet: input.creatorWallet,
      name: input.name,
      symbol: input.symbol,
      description: input.description,
      transaction_hash: input.transactionHash,
    })
    .select("id")
    .single();

  if (basketError) {
    return { ok: false as const, reason: basketError.message };
  }

  const { error: assetError } = await supabase.from("basket_assets").insert(
    input.assets.map((asset) => ({
      basket_id: basket.id,
      symbol: asset.symbol,
      name: asset.name,
      token_address: asset.tokenAddress,
      weight_bps: asset.weightBps,
      price_usd: asset.priceUsd,
      metadata: asset.metadata ?? {},
    })),
  );

  if (assetError) {
    return { ok: false as const, reason: assetError.message };
  }

  return { ok: true as const, basketId: basket.id as string };
}

export async function saveTransactionMetadata(input: TransactionMetadataInput) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      ok: false as const,
      reason: "Supabase is not configured.",
    };
  }

  const { error } = await supabase.from("transactions").insert({
    chain_id: input.chainId,
    hash: input.hash,
    wallet_address: input.walletAddress,
    basket_address: input.basketAddress,
    type: input.type,
    status: input.status,
    metadata: input.metadata ?? {},
    confirmed_at: input.status === "confirmed" ? new Date().toISOString() : null,
  });

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}
