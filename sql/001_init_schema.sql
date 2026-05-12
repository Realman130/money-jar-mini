-- Money Jar Mini — schema gốc
-- Chạy trên Supabase PostgreSQL (public).

create extension if not exists pgcrypto;

-- Người dùng (Telegram)
create table if not exists public.users (
  telegram_user_id bigint primary key,
  username text,
  first_name text,
  last_name text,
  language_code text,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  currency text not null default 'VND',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- 6 hũ (toàn cục)
create table if not exists public.jars (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_vi text not null,
  description text,
  target_percent numeric(5, 2) not null check (target_percent > 0 and target_percent <= 100),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Danh mục (toàn cục — dùng chung)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('thu', 'chi')),
  parent_name text not null,
  name text not null,
  icon text not null default '📁',
  color text not null default '#64748b',
  jar_id uuid references public.jars(id) on delete set null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (parent_name, name, type)
);

create index if not exists idx_categories_type on public.categories(type);
create index if not exists idx_categories_active on public.categories(is_active) where is_active = true;

create table if not exists public.category_aliases (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  alias text not null unique,
  created_at timestamptz not null default now()
);

-- Ví: mỗi user một bộ ví (code unique trong user)
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.users(telegram_user_id) on delete cascade,
  code text not null,
  name_vi text not null,
  kind text not null check (kind in ('cash', 'bank', 'ewallet', 'credit_card', 'saving', 'investment', 'other')),
  opening_balance bigint not null default 0,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (telegram_user_id, code)
);

create index if not exists idx_wallets_user on public.wallets(telegram_user_id);

create table if not exists public.wallet_aliases (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now(),
  unique (wallet_id, alias)
);

create unique index if not exists idx_wallet_aliases_wallet_alias_lower
  on public.wallet_aliases (wallet_id, lower(alias));

-- Giao dịch thu/chi (transfer nằm bảng riêng)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.users(telegram_user_id) on delete cascade,
  amount bigint not null check (amount > 0),
  type text not null check (type in ('thu', 'chi')),
  category_id uuid references public.categories(id) on delete set null,
  wallet_id uuid references public.wallets(id) on delete set null,
  wallet_kind text,
  note text not null default '',
  raw_input text not null default '',
  transaction_date date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  source text not null default 'manual' check (source in ('manual', 'quick_text', 'voice', 'import', 'recurring')),
  merchant text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_tx_user_date on public.transactions(telegram_user_id, transaction_date desc)
  where deleted_at is null;
create index if not exists idx_tx_user_created on public.transactions(telegram_user_id, created_at desc)
  where deleted_at is null;

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.users(telegram_user_id) on delete cascade,
  from_wallet_id uuid not null references public.wallets(id) on delete restrict,
  to_wallet_id uuid not null references public.wallets(id) on delete restrict,
  amount bigint not null check (amount > 0),
  fee_amount bigint not null default 0 check (fee_amount >= 0),
  transfer_date date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  note text not null default '',
  raw_input text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (from_wallet_id <> to_wallet_id)
);

create index if not exists idx_transfers_user on public.transfers(telegram_user_id, transfer_date desc)
  where deleted_at is null;

create table if not exists public.monthly_income_plans (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.users(telegram_user_id) on delete cascade,
  month_date date not null,
  expected_income bigint not null check (expected_income >= 0),
  note text,
  created_at timestamptz not null default now(),
  unique (telegram_user_id, month_date)
);

create table if not exists public.jar_monthly_plans (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.users(telegram_user_id) on delete cascade,
  month_date date not null,
  jar_id uuid not null references public.jars(id) on delete cascade,
  target_percent numeric(5, 2),
  planned_amount bigint,
  created_at timestamptz not null default now(),
  unique (telegram_user_id, month_date, jar_id)
);

create table if not exists public.category_monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.users(telegram_user_id) on delete cascade,
  month_date date not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  budget_amount bigint not null check (budget_amount >= 0),
  created_at timestamptz not null default now(),
  unique (telegram_user_id, month_date, category_id)
);

create or replace function public.mjm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_mjm_transactions_updated on public.transactions;
create trigger tr_mjm_transactions_updated
  before update on public.transactions
  for each row execute function public.mjm_set_updated_at();

drop trigger if exists tr_mjm_transfers_updated on public.transfers;
create trigger tr_mjm_transfers_updated
  before update on public.transfers
  for each row execute function public.mjm_set_updated_at();

comment on table public.transactions is 'Thu/chi; transfer dùng bảng transfers.';
comment on table public.wallets is 'Ví theo từng telegram_user_id.';
