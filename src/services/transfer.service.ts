import { supabase } from "@/lib/supabase";

export async function createTransfer(
  uid: number,
  input: {
    from_wallet_id: string;
    to_wallet_id: string;
    amount: number;
    fee_amount?: number;
    transfer_date: string;
    note: string;
    raw_input: string;
  }
) {
  const { data, error } = await supabase
    .from("transfers")
    .insert({
      telegram_user_id: uid,
      from_wallet_id: input.from_wallet_id,
      to_wallet_id: input.to_wallet_id,
      amount: input.amount,
      fee_amount: input.fee_amount ?? 0,
      transfer_date: input.transfer_date,
      note: input.note,
      raw_input: input.raw_input
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function softDeleteTransfer(id: string) {
  const { error } = await supabase.from("transfers").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    throw error;
  }
}
