-- Views báo cáo (đọc từ bảng gốc; filter telegram_user_id ở app).

create or replace view public.v_transactions_enriched as
select
  t.id,
  t.telegram_user_id,
  t.amount,
  t.type,
  t.note,
  t.raw_input,
  t.transaction_date,
  t.source,
  t.merchant,
  t.tags,
  t.created_at,
  t.updated_at,
  c.id as category_id,
  c.parent_name as category_parent_name,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  c.jar_id,
  j.code as jar_code,
  j.name_vi as jar_name_vi,
  w.id as wallet_id,
  w.code as wallet_code,
  w.name_vi as wallet_name_vi,
  w.kind as wallet_kind
from public.transactions t
left join public.categories c on c.id = t.category_id
left join public.jars j on j.id = c.jar_id
left join public.wallets w on w.id = t.wallet_id and w.telegram_user_id = t.telegram_user_id
where t.deleted_at is null;

create or replace view public.v_monthly_summary as
select
  telegram_user_id,
  date_trunc('month', transaction_date)::date as month_date,
  sum(case when type = 'thu' then amount else 0 end) as total_income,
  sum(case when type = 'chi' then amount else 0 end) as total_expense,
  sum(case when type = 'thu' then amount else -amount end) as net_amount,
  case
    when sum(case when type = 'thu' then amount else 0 end) = 0 then null::numeric
    else round(
      (sum(case when type = 'thu' then amount else 0 end) - sum(case when type = 'chi' then amount else 0 end))::numeric
      / nullif(sum(case when type = 'thu' then amount else 0 end), 0)::numeric * 100,
      2
    )
  end as saving_rate_percent
from public.transactions
where deleted_at is null
group by telegram_user_id, date_trunc('month', transaction_date)::date;

create or replace view public.v_daily_flow as
select
  telegram_user_id,
  transaction_date,
  sum(case when type = 'chi' then amount else 0 end) as total_expense,
  sum(case when type = 'thu' then amount else 0 end) as total_income,
  sum(case when type = 'thu' then amount else -amount end) as net_amount
from public.transactions
where deleted_at is null
group by telegram_user_id, transaction_date;

create or replace view public.v_monthly_expense_by_category as
select
  t.telegram_user_id,
  date_trunc('month', t.transaction_date)::date as month_date,
  coalesce(c.parent_name, '—') as parent_name,
  coalesce(c.name, 'Chưa phân loại') as category_name,
  sum(t.amount) as total_amount,
  count(*)::int as transaction_count
from public.transactions t
left join public.categories c on c.id = t.category_id
where t.deleted_at is null and t.type = 'chi'
group by t.telegram_user_id, date_trunc('month', t.transaction_date)::date,
  coalesce(c.parent_name, '—'), coalesce(c.name, 'Chưa phân loại');

create or replace view public.v_monthly_expense_by_jar as
select
  t.telegram_user_id,
  date_trunc('month', t.transaction_date)::date as month_date,
  j.code as jar_code,
  j.name_vi as jar_name_vi,
  j.target_percent,
  sum(t.amount) as actual_amount,
  count(*)::int as transaction_count
from public.transactions t
left join public.categories c on c.id = t.category_id
left join public.jars j on j.id = c.jar_id
where t.deleted_at is null and t.type = 'chi'
group by t.telegram_user_id, date_trunc('month', t.transaction_date)::date,
  j.code, j.name_vi, j.target_percent;

create or replace view public.v_wallet_balances as
with tx_flow as (
  select
    telegram_user_id,
    wallet_id,
    sum(case when type = 'thu' then amount else 0 end) as sum_in,
    sum(case when type = 'chi' then amount else 0 end) as sum_out
  from public.transactions
  where deleted_at is null and wallet_id is not null
  group by telegram_user_id, wallet_id
),
tr_in as (
  select telegram_user_id, to_wallet_id as wallet_id, sum(amount) as sum_tr_in
  from public.transfers
  where deleted_at is null
  group by telegram_user_id, to_wallet_id
),
tr_out as (
  select telegram_user_id, from_wallet_id as wallet_id, sum(amount + fee_amount) as sum_tr_out
  from public.transfers
  where deleted_at is null
  group by telegram_user_id, from_wallet_id
)
select
  w.telegram_user_id,
  w.id as wallet_id,
  w.code,
  w.name_vi,
  w.kind,
  w.opening_balance,
  w.opening_balance
    + coalesce(tf.sum_in, 0)
    - coalesce(tf.sum_out, 0)
    + coalesce(ti.sum_tr_in, 0)
    - coalesce(to_.sum_tr_out, 0) as current_balance
from public.wallets w
left join tx_flow tf on tf.wallet_id = w.id and tf.telegram_user_id = w.telegram_user_id
left join tr_in ti on ti.wallet_id = w.id and ti.telegram_user_id = w.telegram_user_id
left join tr_out to_ on to_.wallet_id = w.id and to_.telegram_user_id = w.telegram_user_id
where w.is_active = true;

create or replace view public.v_top_merchants as
select
  telegram_user_id,
  date_trunc('month', transaction_date)::date as month_date,
  merchant,
  sum(amount) as total_amount,
  count(*)::int as transaction_count
from public.transactions
where deleted_at is null and type = 'chi' and merchant is not null and btrim(merchant) <> ''
group by telegram_user_id, date_trunc('month', transaction_date)::date, merchant;
