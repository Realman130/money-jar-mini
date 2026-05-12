import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { useApp } from "@/context/AppContext";
import { fetchWalletBalances } from "@/services/wallet.service";

export function WalletsPage() {
  const { telegramUserId, ready, error } = useApp();
  const [rows, setRows] = useState<{ name_vi: string; code: string; current_balance: number; kind: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !telegramUserId) {
      setLoading(false);
      return;
    }
    fetchWalletBalances(telegramUserId)
      .then((d) =>
        setRows(
          (d as { name_vi: string; code: string; current_balance: number; kind: string }[]).map((r) => ({
            ...r,
            current_balance: Number(r.current_balance)
          }))
        )
      )
      .finally(() => setLoading(false));
  }, [ready, telegramUserId]);

  const total = rows.reduce((s, r) => s + r.current_balance, 0);

  if (!ready || error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }
  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <PageHeader title="Ví tiền" subtitle="Số dư theo luồng thu/chi/chuyển" />
      <div className="mb-4 rounded-2xl border border-mjm-border bg-mjm-surface p-4">
        <p className="text-sm text-mjm-muted">Tổng tài sản</p>
        <p className="text-2xl font-bold tabular-nums text-mjm-text">
          <MoneyText amount={total} />
        </p>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.code} className="flex items-center justify-between rounded-xl border border-mjm-border bg-mjm-surface px-3 py-3">
            <div>
              <p className="font-medium">{r.name_vi}</p>
              <p className="text-xs text-mjm-muted">{r.kind}</p>
            </div>
            <MoneyText amount={r.current_balance} />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-mjm-muted">
        Đổi tên / số dư ban đầu: cập nhật trực tiếp bảng `wallets` trong Supabase hoặc mở rộng form sau.
      </p>
    </div>
  );
}
