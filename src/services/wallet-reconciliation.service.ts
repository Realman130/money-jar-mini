import { supabase } from "@/lib/supabase";
import type { WalletReconciliationResult } from "@/types/domain";

export interface ReconcileWalletBalanceInput {
  userId: number;
  walletId: string;
  appBalance: number;
  actualBalance: number;
  targetJarId: string | null;
}

export async function reconcileWalletBalance({
  userId,
  walletId,
  appBalance,
  actualBalance,
  targetJarId
}: ReconcileWalletBalanceInput): Promise<WalletReconciliationResult> {
  const { data, error } = await supabase.rpc("mjm_reconcile_wallet_balance", {
    p_user_id: userId,
    p_wallet_id: walletId,
    p_app_balance: Math.round(appBalance),
    p_actual_balance: Math.round(actualBalance),
    p_target_jar_id: targetJarId
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("Không nhận được kết quả đối soát số dư.");
  }

  return {
    transaction_id: row.transaction_id ?? null,
    delta: Number(row.delta ?? 0),
    adjustment_type: row.adjustment_type ?? "none",
    category_id: row.category_id ?? null,
    actual_balance: Number(row.actual_balance ?? actualBalance)
  };
}
