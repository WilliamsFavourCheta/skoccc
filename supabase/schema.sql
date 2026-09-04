create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_wallet_address_format check (wallet_address ~* '^0x[0-9a-f]{40}$')
);

create table if not exists public.baskets (
  id uuid primary key default gen_random_uuid(),
  chain_id integer not null,
  address text not null,
  creator_wallet text not null,
  name text not null,
  symbol text not null,
  description text,
  transaction_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chain_id, address),
  constraint baskets_address_format check (address ~* '^0x[0-9a-f]{40}$'),
  constraint baskets_creator_wallet_format check (creator_wallet ~* '^0x[0-9a-f]{40}$'),
  constraint baskets_symbol_length check (char_length(symbol) between 1 and 12)
);

create table if not exists public.basket_assets (
  id uuid primary key default gen_random_uuid(),
  basket_id uuid not null references public.baskets(id) on delete cascade,
  symbol text not null,
  name text not null,
  token_address text not null,
  weight_bps integer not null,
  price_usd numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (basket_id, token_address),
  constraint basket_assets_token_address_format check (token_address ~* '^0x[0-9a-f]{40}$'),
  constraint basket_assets_weight_bps_range check (weight_bps > 0 and weight_bps <= 10000)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  chain_id integer not null,
  hash text not null,
  wallet_address text not null,
  basket_address text,
  type text not null,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (chain_id, hash),
  constraint transactions_wallet_address_format check (wallet_address ~* '^0x[0-9a-f]{40}$'),
  constraint transactions_basket_address_format check (basket_address is null or basket_address ~* '^0x[0-9a-f]{40}$'),
  constraint transactions_type_check check (type in ('basket_creation', 'mint', 'redeem', 'transfer')),
  constraint transactions_status_check check (status in ('pending', 'confirmed', 'failed'))
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  basket_address text not null,
  chain_id integer not null,
  created_at timestamptz not null default now(),
  unique (wallet_address, chain_id, basket_address),
  constraint watchlists_wallet_address_format check (wallet_address ~* '^0x[0-9a-f]{40}$'),
  constraint watchlists_basket_address_format check (basket_address ~* '^0x[0-9a-f]{40}$')
);

alter table public.users enable row level security;
alter table public.baskets enable row level security;
alter table public.basket_assets enable row level security;
alter table public.transactions enable row level security;
alter table public.watchlists enable row level security;

create policy "public metadata is readable"
  on public.baskets for select
  using (true);

create policy "public users can be inserted"
  on public.users for insert
  with check (true);

create policy "public basket metadata can be inserted"
  on public.baskets for insert
  with check (true);

create policy "public basket assets are readable"
  on public.basket_assets for select
  using (true);

create policy "public basket assets can be inserted"
  on public.basket_assets for insert
  with check (true);

create policy "public transaction metadata is readable"
  on public.transactions for select
  using (true);

create policy "public transaction metadata can be inserted"
  on public.transactions for insert
  with check (true);

create policy "public watchlists are readable"
  on public.watchlists for select
  using (true);

create policy "public watchlists can be inserted"
  on public.watchlists for insert
  with check (true);
