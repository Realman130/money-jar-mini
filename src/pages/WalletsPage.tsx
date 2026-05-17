import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { MetricCard, Pill, ProgressBar, SectionHeader, Surface } from "@/components/common/Fintech";
import { WalletReconciliationDialog } from "@/components/wallets/WalletReconciliationDialog";
import { useApp } from "@/context/AppContext";
import { fetchWalletBalances } from "@/services/wallet.service";
import { reconcileWalletBalance } from "@/services/wallet-reconciliation.service";
import type { WalletBalanceRow } from "@/types/domain";

export function WalletsPage() {
  const { telegramUserId, ready, error } = useApp();
  const [rows, setRows] = useState<WalletBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<WalletBalanceRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadBalances = async (uid: number) => {
    const data = await fetchWalletBalances(uid);
    setRows(data);
  };

  useEffect(() => {
    if (!ready || !telegramUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadBalances(telegramUserId)
      .finally(() => setLoading(false));
  }, [ready, telegramUserId]);

  const total = rows.reduce((s, r) => s + r.current_balance, 0);

  const summary = useMemo(() => {
    return {
      cash: rows.filter((r) => r.kind === "cash").length,
      bank: rows.filter((r) => r.kind === "bank").length,
      other: rows.filter((r) => !["cash", "bank"].includes(r.kind)).length
    };
  }, [rows]);

  if (!ready || error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }
  if (loading) {
    return <Loading />;
  }

  const handleConfirmReconciliation = async ({ actualBalance, targetJarId }: { actualBalance: number; targetJarId: string | null }) => {
    if (!telegramUserId || !selectedWallet) {
      throw new Error("Không tìm thấy ví để đối soát.");
    }

    const result = await reconcileWalletBalance({
      userId: telegramUserId,
      walletId: selectedWallet.wallet_id,
      appBalance: selectedWallet.current_balance,
      actualBalance,
      targetJarId
    });

    await loadBalances(telegramUserId);
    setSelectedWallet(null);
    setToast(
      result.delta === 0
        ? "Số dư đã khớp, không cần tạo bù lệch."
        : result.adjustment_type === "thu"
          ? `Đã chốt số dư và tạo dòng thu bù ${Math.abs(result.delta).toLocaleString("vi-VN")}đ.`
          : `Đã chốt số dư và tạo dòng chi bù ${Math.abs(result.delta).toLocaleString("vi-VN")}đ.`
    );
    window.setTimeout(() => setToast(null), 2600);
    return result;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Ví tiền" subtitle="Số dư, loại ví, và phân bổ tiền." kicker="Assets" />

      <Surface className="space-y-4">
        <SectionHeader title="Tổng tài sản" subtitle="Tổng hợp số dư hiện tại từ các ví đang hoạt động." />
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Tổng" value={<MoneyText amount={total} />} tone="accent" className="p-3" />
          <MetricCard label="Số ví" value={rows.length.toLocaleString("vi-VN")} hint="Ví đang active" className="p-3" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Cash</p>
            <p className="mt-1 font-semibold text-mjm-text">{summary.cash}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Bank</p>
            <p className="mt-1 font-semibold text-mjm-text">{summary.bank}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Khác</p>
            <p className="mt-1 font-semibold text-mjm-text">{summary.other}</p>
          </div>
        </div>
      </Surface>

      <Surface className="space-y-3">
        <SectionHeader title="Danh sách ví" subtitle="Mỗi ví có thanh tỷ lệ theo tổng tài sản." />
        <div className="space-y-3">
          {rows.map((r) => {
            const share = total > 0 ? (r.current_balance / total) * 100 : 0;
            const label =
              r.kind === "cash"
                ? "Tiền mặt"
                : r.kind === "bank"
                  ? "Ngân hàng"
                  : r.kind === "ewallet"
                    ? "Ví điện tử"
                    : r.kind === "saving"
                      ? "Tiết kiệm"
                      : r.kind === "investment"
                        ? "Đầu tư"
                        : "Khác";
            const tone = r.kind === "cash" ? "accent" : r.kind === "bank" ? "accent" : r.kind === "saving" ? "income" : r.kind === "ewallet" ? "warn" : "accent";
            return (
              <div key={r.code} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-mjm-text">{r.name_vi}</p>
                      <Pill tone={tone}>{label}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-mjm-muted">{r.code.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <MoneyText amount={r.current_balance} />
                    <button
                      type="button"
                      onClick={() => setSelectedWallet(r)}
                      className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mjm-text transition hover:border-mjm-accent/35 hover:bg-mjm-accent/12 hover:text-mjm-accent"
                    >
                      Chốt số dư thực tế
                    </button>
                  </div>
                </div>
                <ProgressBar value={share} tone={tone} className="mt-3" />
              </div>
            );
          })}
        </div>
      </Surface>

      <WalletReconciliationDialog
        open={selectedWallet != null}
        wallet={selectedWallet}
        onClose={() => setSelectedWallet(null)}
        onConfirm={handleConfirmReconciliation}
      />

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-white/10 bg-[#0d1420]/95 px-4 py-2 text-sm font-medium text-mjm-text shadow-[0_20px_50px_rgba(2,6,23,0.45)] backdrop-blur-2xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
