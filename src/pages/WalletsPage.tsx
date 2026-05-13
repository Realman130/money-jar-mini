import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { MetricCard, Pill, ProgressBar, SectionHeader, Surface } from "@/components/common/Fintech";
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
                  <MoneyText amount={r.current_balance} />
                </div>
                <ProgressBar value={share} tone={tone} className="mt-3" />
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}
