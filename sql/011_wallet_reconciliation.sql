alter table public.transactions
  add column if not exists is_adjustment boolean not null default false;

alter table public.wallets
  add column if not exists last_reconciled_balance bigint,
  add column if not exists last_reconciled_at timestamptz;

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
  w.kind as wallet_kind,
  t.is_adjustment
from public.transactions t
left join public.categories c on c.id = t.category_id
left join public.jars j on j.id = c.jar_id
left join public.wallets w on w.id = t.wallet_id and w.telegram_user_id = t.telegram_user_id
where t.deleted_at is null;

create or replace function public.mjm_reconcile_wallet_balance(
  p_user_id bigint,
  p_wallet_id uuid,
  p_app_balance bigint,
  p_actual_balance bigint,
  p_target_jar_id uuid default null
)
returns table (
  transaction_id uuid,
  delta bigint,
  adjustment_type text,
  category_id uuid,
  actual_balance bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet record;
  v_delta bigint;
  v_kind text;
  v_category_id uuid;
  v_target_jar_id uuid;
  v_target_jar_name text;
  v_parent_name text;
begin
  select id, telegram_user_id, name_vi, kind
  into v_wallet
  from public.wallets
  where id = p_wallet_id
    and telegram_user_id = p_user_id
    and is_active = true;

  if v_wallet.id is null then
    raise exception 'Wallet not found or inactive';
  end if;

  if p_actual_balance < 0 then
    raise exception 'Actual balance must be greater than or equal to 0';
  end if;

  v_delta := p_actual_balance - p_app_balance;

  update public.wallets
  set
    last_reconciled_balance = p_actual_balance,
    last_reconciled_at = now()
  where id = p_wallet_id
    and telegram_user_id = p_user_id;

  if v_delta = 0 then
    transaction_id := null;
    delta := 0;
    adjustment_type := 'none';
    category_id := null;
    actual_balance := p_actual_balance;
    return next;
    return;
  end if;

  if v_delta < 0 then
    v_kind := 'chi';
    select coalesce(p_target_jar_id, j.id), j.name_vi
    into v_target_jar_id, v_target_jar_name
    from public.jars j
    where j.id = coalesce(p_target_jar_id, j.id)
      and (p_target_jar_id is not null or j.code = 'essential')
    order by case when j.id = p_target_jar_id then 0 else 1 end
    limit 1;

    if v_target_jar_id is null then
      raise exception 'Target jar not found';
    end if;

    v_parent_name := format('Điều chỉnh ví / %s', v_target_jar_name);

    select c.id
    into v_category_id
    from public.categories c
    where c.type = 'chi'
      and c.parent_name = v_parent_name
      and c.name = 'Điều chỉnh số dư'
    limit 1;

    if v_category_id is null then
      insert into public.categories (
        type,
        parent_name,
        name,
        icon,
        color,
        jar_id,
        sort_order,
        is_active,
        note
      )
      values (
        'chi',
        v_parent_name,
        'Điều chỉnh số dư',
        '🧮',
        '#ff7462',
        v_target_jar_id,
        995,
        true,
        'Danh mục hệ thống dùng cho đối soát số dư ví'
      )
      returning id into v_category_id;
    end if;
  else
    v_kind := 'thu';

    select c.id
    into v_category_id
    from public.categories c
    where c.type = 'thu'
      and c.parent_name = 'Điều chỉnh ví'
      and c.name = 'Điều chỉnh số dư'
    limit 1;

    if v_category_id is null then
      insert into public.categories (
        type,
        parent_name,
        name,
        icon,
        color,
        jar_id,
        sort_order,
        is_active,
        note
      )
      values (
        'thu',
        'Điều chỉnh ví',
        'Điều chỉnh số dư',
        '🧮',
        '#4ade80',
        null,
        995,
        true,
        'Danh mục hệ thống dùng cho đối soát số dư ví'
      )
      returning id into v_category_id;
    end if;
  end if;

  insert into public.transactions (
    telegram_user_id,
    amount,
    type,
    category_id,
    wallet_id,
    wallet_kind,
    note,
    raw_input,
    transaction_date,
    source,
    merchant,
    tags,
    is_adjustment
  )
  values (
    p_user_id,
    abs(v_delta),
    v_kind,
    v_category_id,
    p_wallet_id,
    v_wallet.kind,
    'Điều chỉnh số dư ví',
    format(
      'reconcile wallet=%s app=%s actual=%s delta=%s',
      v_wallet.name_vi,
      p_app_balance,
      p_actual_balance,
      v_delta
    ),
    (now() at time zone 'Asia/Ho_Chi_Minh')::date,
    'manual',
    null,
    array['reconciliation', 'system_adjustment'],
    true
  )
  returning id into transaction_id;

  delta := v_delta;
  adjustment_type := v_kind;
  category_id := v_category_id;
  actual_balance := p_actual_balance;
  return next;
end;
$$;

grant execute on function public.mjm_reconcile_wallet_balance(bigint, uuid, bigint, bigint, uuid) to anon, authenticated;
