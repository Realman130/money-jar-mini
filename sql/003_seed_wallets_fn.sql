-- Tạo 5 ví mặc định + alias khi có user mới.

create or replace function public.mjm_seed_wallets_for_user(p_uid bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w_cash uuid;
  w_bank uuid;
  w_momo uuid;
  w_saving uuid;
  w_inv uuid;
begin
  insert into public.wallets (telegram_user_id, code, name_vi, kind, opening_balance, sort_order)
  values
    (p_uid, 'cash', 'Tiền mặt', 'cash', 0, 1),
    (p_uid, 'bank', 'Ngân hàng', 'bank', 0, 2),
    (p_uid, 'momo', 'MoMo', 'ewallet', 0, 3),
    (p_uid, 'saving', 'Tiết kiệm', 'saving', 0, 4),
    (p_uid, 'investment', 'Đầu tư', 'investment', 0, 5)
  on conflict (telegram_user_id, code) do nothing;

  select id into w_cash from wallets where telegram_user_id = p_uid and code = 'cash';
  select id into w_bank from wallets where telegram_user_id = p_uid and code = 'bank';
  select id into w_momo from wallets where telegram_user_id = p_uid and code = 'momo';
  select id into w_saving from wallets where telegram_user_id = p_uid and code = 'saving';
  select id into w_inv from wallets where telegram_user_id = p_uid and code = 'investment';

  insert into public.wallet_aliases (wallet_id, alias)
  select w_cash, x from unnest(array['tm', 'cash', 'tiền mặt', 'tien mat']) as x
  on conflict (wallet_id, alias) do nothing;

  insert into public.wallet_aliases (wallet_id, alias)
  select w_bank, x from unnest(array['bank', 'ck', 'chuyển khoản', 'chuyen khoan', 'ngân hàng', 'ngan hang']) as x
  on conflict (wallet_id, alias) do nothing;

  insert into public.wallet_aliases (wallet_id, alias)
  select w_momo, x from unnest(array['momo']) as x
  on conflict (wallet_id, alias) do nothing;

  insert into public.wallet_aliases (wallet_id, alias)
  select w_saving, x from unnest(array['tiết kiệm', 'tiet kiem', 'saving']) as x
  on conflict (wallet_id, alias) do nothing;

  insert into public.wallet_aliases (wallet_id, alias)
  select w_inv, x from unnest(array['đầu tư', 'dau tu', 'investment']) as x
  on conflict (wallet_id, alias) do nothing;
end;
$$;

create or replace function public.mjm_after_user_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.mjm_seed_wallets_for_user(new.telegram_user_id);
  return new;
end;
$$;

drop trigger if exists tr_mjm_user_seed_wallets on public.users;
create trigger tr_mjm_user_seed_wallets
  after insert on public.users
  for each row execute function public.mjm_after_user_insert();
