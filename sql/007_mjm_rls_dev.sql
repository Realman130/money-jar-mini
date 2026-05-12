-- RLS dành cho giai đoạn dev / Mini App (anon).
-- CẢNH BÁO: Mọi client biết anon key đều có thể đọc/ghi mọi user.
-- Production: thay bằng xác thực (Edge Function + JWT) hoặc session server.

alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_aliases enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.monthly_income_plans enable row level security;
alter table public.jar_monthly_plans enable row level security;
alter table public.category_monthly_budgets enable row level security;

-- Categories / jars / aliases
alter table public.categories enable row level security;
alter table public.jars enable row level security;
alter table public.category_aliases enable row level security;

drop policy if exists "mjm_categories_read" on public.categories;
drop policy if exists "mjm_categories_mut" on public.categories;
drop policy if exists "mjm_jars_read" on public.jars;
drop policy if exists "mjm_cat_alias_read" on public.category_aliases;
drop policy if exists "mjm_cat_alias_mut" on public.category_aliases;
drop policy if exists "mjm_users_all" on public.users;
drop policy if exists "mjm_wallets_all" on public.wallets;
drop policy if exists "mjm_wallet_alias_all" on public.wallet_aliases;
drop policy if exists "mjm_tx_all" on public.transactions;
drop policy if exists "mjm_tr_all" on public.transfers;
drop policy if exists "mjm_income_plan_all" on public.monthly_income_plans;
drop policy if exists "mjm_jar_plan_all" on public.jar_monthly_plans;
drop policy if exists "mjm_cat_budget_all" on public.category_monthly_budgets;

create policy "mjm_categories_mut" on public.categories for all to anon, authenticated using (true) with check (true);
create policy "mjm_jars_read" on public.jars for select to anon, authenticated using (true);
create policy "mjm_cat_alias_mut" on public.category_aliases for all to anon, authenticated using (true) with check (true);

create policy "mjm_users_all" on public.users for all to anon, authenticated using (true) with check (true);
create policy "mjm_wallets_all" on public.wallets for all to anon, authenticated using (true) with check (true);
create policy "mjm_wallet_alias_all" on public.wallet_aliases for all to anon, authenticated using (true) with check (true);
create policy "mjm_tx_all" on public.transactions for all to anon, authenticated using (true) with check (true);
create policy "mjm_tr_all" on public.transfers for all to anon, authenticated using (true) with check (true);
create policy "mjm_income_plan_all" on public.monthly_income_plans for all to anon, authenticated using (true) with check (true);
create policy "mjm_jar_plan_all" on public.jar_monthly_plans for all to anon, authenticated using (true) with check (true);
create policy "mjm_cat_budget_all" on public.category_monthly_budgets for all to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select on public.v_transactions_enriched to anon, authenticated;
grant select on public.v_monthly_summary to anon, authenticated;
grant select on public.v_daily_flow to anon, authenticated;
grant select on public.v_monthly_expense_by_category to anon, authenticated;
grant select on public.v_monthly_expense_by_jar to anon, authenticated;
grant select on public.v_wallet_balances to anon, authenticated;
grant select on public.v_top_merchants to anon, authenticated;

grant execute on function public.mjm_seed_wallets_for_user(bigint) to anon, authenticated;
