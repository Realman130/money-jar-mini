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

export async function createWallet(input: Omit<WalletRow, "id" | "is_active">): Promise<WalletRow> {
  const { data, error } = await supabase
    .from("wallets")
    .insert({
      telegram_user_id: input.telegram_user_id,
      code: input.code.trim().toLowerCase(),
      name_vi: input.name_vi.trim(),
      kind: input.kind,
      opening_balance: input.opening_balance ?? 0,
      sort_order: input.sort_order ?? 0,
      is_active: true
    })
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data as WalletRow;
}

export async function updateWallet(id: string, input: Partial<Omit<WalletRow, "id" | "telegram_user_id">>): Promise<void> {
  const { error } = await supabase
    .from("wallets")
    .update(input)
    .eq("id", id);
  if (error) {
    throw error;
  }
}

