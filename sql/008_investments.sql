-- Investment / portfolio schema cho crypto assets tracker.
-- MVP 1: manual holdings + live price cache.

create table if not exists public.investment_positions (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null references public.users(telegram_user_id) on delete cascade,
  asset_code text not null,
  asset_name text not null,
  market_symbol text not null,
  exchange_name text not null default 'Binance',
  quantity numeric(36, 18) not null check (quantity > 0),
  avg_cost_usdt numeric(24, 8) not null default 0 check (avg_cost_usdt >= 0),
  note text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (telegram_user_id, market_symbol)
);

create index if not exists idx_investment_positions_user
  on public.investment_positions(telegram_user_id, deleted_at, sort_order, created_at desc);

create index if not exists idx_investment_positions_symbol
  on public.investment_positions(market_symbol);

create table if not exists public.investment_price_cache (
  symbol text primary key,
  price_usdt numeric(24, 8) not null,
  price_change_percent_24h numeric(12, 4),
  quote_volume_usdt numeric(24, 8),
  source text not null default 'binance',
  updated_at timestamptz not null default now()
);

create index if not exists idx_investment_price_cache_updated
  on public.investment_price_cache(updated_at desc);

drop trigger if exists tr_mjm_investment_positions_updated on public.investment_positions;
create trigger tr_mjm_investment_positions_updated
  before update on public.investment_positions
  for each row execute function public.mjm_set_updated_at();

create or replace view public.v_investment_positions_enriched as
select
  p.id,
  p.telegram_user_id,
  p.asset_code,
  p.asset_name,
  p.market_symbol,
  p.exchange_name,
  p.quantity,
  p.avg_cost_usdt,
  p.note,
  p.sort_order,
  p.created_at,
  p.updated_at,
  p.deleted_at,
  pc.price_usdt as market_price_usdt,
  pc.price_change_percent_24h,
  pc.quote_volume_usdt,
  p.quantity * p.avg_cost_usdt as cost_basis_usdt,
  p.quantity * coalesce(pc.price_usdt, p.avg_cost_usdt) as market_value_usdt,
  p.quantity * coalesce(pc.price_usdt, p.avg_cost_usdt) - (p.quantity * p.avg_cost_usdt) as net_pnl_usdt,
  case
    when p.quantity * p.avg_cost_usdt = 0 then null::numeric
    else round(
      (
        (p.quantity * coalesce(pc.price_usdt, p.avg_cost_usdt)) - (p.quantity * p.avg_cost_usdt)
      ) / nullif((p.quantity * p.avg_cost_usdt), 0) * 100,
      2
    )
  end as net_pnl_percent,
  case
    when pc.price_change_percent_24h is null then 0
    else (p.quantity * coalesce(pc.price_usdt, p.avg_cost_usdt)) * (pc.price_change_percent_24h / 100)
  end as pnl_24h_usdt
from public.investment_positions p
left join public.investment_price_cache pc on pc.symbol = p.market_symbol
where p.deleted_at is null;

create or replace view public.v_investment_summary as
select
  telegram_user_id,
  count(*)::int as total_positions,
  coalesce(sum(quantity), 0) as total_quantity,
  coalesce(sum(cost_basis_usdt), 0) as total_cost_usdt,
  coalesce(sum(market_value_usdt), 0) as total_market_value_usdt,
  coalesce(sum(net_pnl_usdt), 0) as net_pnl_usdt,
  case
    when coalesce(sum(cost_basis_usdt), 0) = 0 then null::numeric
    else round(coalesce(sum(net_pnl_usdt), 0) / nullif(sum(cost_basis_usdt), 0) * 100, 2)
  end as net_pnl_percent,
  coalesce(sum(pnl_24h_usdt), 0) as pnl_24h_usdt,
  max(greatest(updated_at, created_at)) as updated_at
from public.v_investment_positions_enriched
group by telegram_user_id;

comment on table public.investment_positions is 'Manual holdings cho crypto / assets tracker.';
comment on table public.investment_price_cache is 'Cache giá public từ Binance Spot API.';
comment on view public.v_investment_positions_enriched is 'Vị thế đầu tư kèm giá live và P/L.';
comment on view public.v_investment_summary is 'Tổng hợp portfolio theo telegram_user_id.';
