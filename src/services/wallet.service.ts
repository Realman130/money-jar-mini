import { supabase } from "@/lib/supabase";
import type { WalletBalanceRow, WalletRow } from "@/types/domain";

export async function fetchWallets(uid: number): Promise<WalletRow[]> {
  const { data, error } = await supabase
    .from("wallets")
    .select("id, telegram_user_id, code, name_vi, kind, opening_balance, sort_order, is_active")
    .eq("telegram_user_id", uid)
    .eq("is_active", true)
    .order("sort_order");
  if (error) {
    throw error;
  }
  return (data ?? []) as WalletRow[];
}

export async function fetchWalletBalances(uid: number): Promise<WalletBalanceRow[]> {
  const { data, error } = await supabase.from("v_wallet_balances").select("*").eq("telegram_user_id", uid);
  if (error) {
    throw error;
  }
  return ((data ?? []) as WalletBalanceRow[]).map((row) => ({
    ...row,
    current_balance: Number(row.current_balance)
  }));
}
