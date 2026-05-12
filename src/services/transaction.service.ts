import { supabase } from "@/lib/supabase";
import type { TxSource } from "@/types/domain";

export interface TxFilters {
  from?: string;
  to?: string;
  type?: "thu" | "chi";
  walletId?: string;
  search?: string;
}

export async function createTransaction(
  uid: number,
  input: {
    amount: number;
    type: "thu" | "chi";
    category_id: string | null;
    wallet_id: string | null;
    note: string;
    raw_input: string;
    transaction_date: string;
    source: TxSource;
    merchant?: string | null;
  }
) {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      telegram_user_id: uid,
      amount: input.amount,
      type: input.type,
      category_id: input.category_id,
      wallet_id: input.wallet_id,
      note: input.note,
      raw_input: input.raw_input,
      transaction_date: input.transaction_date,
      source: input.source,
      merchant: input.merchant ?? null
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function softDeleteTransaction(id: string) {
  const { error } = await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    throw error;
  }
}

export async function updateTransaction(
  id: string,
  input: {
    amount: number;
    type: "thu" | "chi";
    category_id: string | null;
    wallet_id: string | null;
    note: string;
    transaction_date: string;
    raw_input?: string;
  }
) {
  const { error } = await supabase
    .from("transactions")
    .update({
      amount: input.amount,
      type: input.type,
      category_id: input.category_id,
      wallet_id: input.wallet_id,
      note: input.note,
      transaction_date: input.transaction_date,
      ...(input.raw_input != null ? { raw_input: input.raw_input } : {})
    })
    .eq("id", id);
  if (error) {
    throw error;
  }
}

export async function fetchTransactionsEnriched(uid: number, filters: TxFilters = {}) {
  let q = supabase
    .from("v_transactions_enriched")
    .select("*")
    .eq("telegram_user_id", uid)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.from) {
    q = q.gte("transaction_date", filters.from);
  }
  if (filters.to) {
    q = q.lte("transaction_date", filters.to);
  }
  if (filters.type) {
    q = q.eq("type", filters.type);
  }
  if (filters.walletId) {
    q = q.eq("wallet_id", filters.walletId);
  }
  if (filters.search) {
    const s = `%${filters.search}%`;
    q = q.or(`note.ilike.${s},raw_input.ilike.${s},category_name.ilike.${s},merchant.ilike.${s}`);
  }

  const { data, error } = await q.limit(500);
  if (error) {
    throw error;
  }
  return data ?? [];
}

export function groupByDate(rows: { transaction_date: string }[]) {
  const map = new Map<string, typeof rows>();
  for (const r of rows) {
    const d = r.transaction_date;
    if (!map.has(d)) {
      map.set(d, []);
    }
    map.get(d)!.push(r);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}
