import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { MetricCard, Pill, ProgressBar, SectionHeader, Surface } from "@/components/common/Fintech";
import { WalletReconciliationDialog } from "@/components/wallets/WalletReconciliationDialog";
import { useApp } from "@/context/AppContext";
import { fetchWalletBalances, createWallet, updateWallet } from "@/services/wallet.service";
import { reconcileWalletBalance } from "@/services/wallet-reconciliation.service";
import type { WalletBalanceRow, WalletKind } from "@/types/domain";

const fieldClass =
  "w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text placeholder:text-mjm-muted outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15";

export function WalletsPage() {
  const { telegramUserId, ready, error, refreshCatalog } = useApp();
  const [rows, setRows] = useState<WalletBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<WalletBalanceRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // CRUD state
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletBalanceRow | null>(null);
  const [formWalletCode, setFormWalletCode] = useState("");
  const [formWalletNameVi, setFormWalletNameVi] = useState("");
  const [formWalletKind, setFormWalletKind] = useState<WalletKind>("bank");
  const [formWalletOpening, setFormWalletOpening] = useState("0");
  const [formWalletSortOrder, setFormWalletSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

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

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const openAddWallet = () => {
    setEditingWallet(null);
    setFormWalletCode("");
    setFormWalletNameVi("");
    setFormWalletKind("bank");
    setFormWalletOpening("0");
    setFormWalletSortOrder("0");
    setShowWalletSheet(true);
  };

  const openEditWallet = (w: WalletBalanceRow) => {
    setEditingWallet(w);
    setFormWalletCode(w.code);
    setFormWalletNameVi(w.name_vi);
    setFormWalletKind(w.kind);
    // Since opening balance is not in WalletBalanceRow directly, we fetch it if we want or just keep it 0 / placeholder.
    // For simplicity, we can load all wallets from useApp to get opening_balance!
    const fullWallet = (window as any)._walletsCatalog?.find((x: any) => x.id === w.wallet_id);
    setFormWalletOpening(String(fullWallet?.opening_balance ?? 0));
    setFormWalletSortOrder(String(fullWallet?.sort_order ?? 0));
    setShowWalletSheet(true);
  };

  const closeWalletSheet = () => {
    setShowWalletSheet(false);
    setEditingWallet(null);
  };

  const handleSaveWallet = async () => {
    if (!telegramUserId) return;
    const code = formWalletCode.trim().toLowerCase();
    const nameVi = formWalletNameVi.trim();
    const opening = Number.parseInt(formWalletOpening.replace(/\D/g, ""), 10) || 0;
    const sortOrder = Number.parseInt(formWalletSortOrder, 10) || 0;

    if (!code || !nameVi) {
      showToast("Vui lòng nhập Mã ví và Tên hiển thị");
      return;
    }

    setSaving(true);
    try {
      if (editingWallet) {
        await updateWallet(editingWallet.wallet_id, {
          code,
          name_vi: nameVi,
          kind: formWalletKind,
          opening_balance: opening,
          sort_order: sortOrder
        });
        showToast("Đã cập nhật ví");
      } else {
        await createWallet({
          telegram_user_id: telegramUserId,
          code,
          name_vi: nameVi,
          kind: formWalletKind,
          opening_balance: opening,
          sort_order: sortOrder
        });
        showToast("Đã thêm ví mới");
      }
      await refreshCatalog();
      await loadBalances(telegramUserId);
      closeWalletSheet();
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWallet = async () => {
    if (!editingWallet || !telegramUserId) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ví "${editingWallet.name_vi}"?`)) {
      return;
    }
    setSaving(true);
    try {
      await updateWallet(editingWallet.wallet_id, { is_active: false });
      showToast("Đã xóa ví");
      await refreshCatalog();
      await loadBalances(telegramUserId);
      closeWalletSheet();
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

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
    showToast(
      result.delta === 0
        ? "Số dư đã khớp, không cần tạo bù lệch."
        : result.adjustment_type === "thu"
          ? `Đã chốt số dư và tạo dòng thu bù ${Math.abs(result.delta).toLocaleString("vi-VN")}đ.`
          : `Đã chốt số dư và tạo dòng chi bù ${Math.abs(result.delta).toLocaleString("vi-VN")}đ.`
    );
    return result;
  };

  if (!ready || error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }
  if (loading) {
    return <Loading />;
  }

  // Bind the wallets list to window so we can lookup opening_balance / sort_order easily
  const { wallets: catalogWallets } = useApp();
  (window as any)._walletsCatalog = catalogWallets;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Ví tiền"
        subtitle="Số dư, loại ví, và phân bổ tiền."
        kicker="Assets"
        action={
          <button
            type="button"
            onClick={openAddWallet}
            className="inline-flex rounded-full border border-mjm-accent bg-mjm-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-mjm-accent transition hover:bg-mjm-accent hover:text-white"
          >
            + Thêm ví
          </button>
        }
      />

      <Surface className="space-y-4">
        <SectionHeader title="Tổng tài sản" subtitle="Tổng hợp số dư hiện tại từ các ví đang hoạt động." />
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Tổng" value={<MoneyText amount={total} />} tone="accent" className="p-3" />
          <MetricCard label="Số ví" value={rows.length.toLocaleString("vi-VN")} hint="Ví đang hoạt động" className="p-3" />
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
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditWallet(r)}
                        className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mjm-muted transition hover:border-white/20 hover:bg-white/10 hover:text-mjm-text"
                      >
                        Sửa ví
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedWallet(r)}
                        className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mjm-text transition hover:border-mjm-accent/35 hover:bg-mjm-accent/12 hover:text-mjm-accent"
                      >
                        Chốt số dư
                      </button>
                    </div>
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

      {showWalletSheet && (
        <div className="fixed inset-0 z-50 animate-fade-in" role="dialog" aria-modal="true">
          <div aria-hidden="true" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeWalletSheet} />
          <div className="absolute inset-x-3 bottom-3 mx-auto max-h-[85vh] w-auto max-w-[430px] overflow-y-auto rounded-[32px] border border-white/10 bg-[#0c131f]/96 p-4 shadow-[0_30px_90px_rgba(2,6,23,0.55)] outline-none">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-semibold text-mjm-text">
                {editingWallet ? "Sửa ví tiền" : "Thêm ví tiền mới"}
              </h3>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-mjm-text"
                onClick={closeWalletSheet}
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Wallet Code */}
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Mã ví (viết liền không dấu, e.g. momo, tcb)</span>
                <input
                  type="text"
                  value={formWalletCode}
                  onChange={(e) => setFormWalletCode(e.target.value)}
                  placeholder="Ví dụ: momo, vcb, cash"
                  disabled={editingWallet != null}
                  className={fieldClass}
                />
              </div>

              {/* Wallet Name */}
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Tên hiển thị</span>
                <input
                  type="text"
                  value={formWalletNameVi}
                  onChange={(e) => setFormWalletNameVi(e.target.value)}
                  placeholder="Ví dụ: Ví Momo, Vietcombank..."
                  className={fieldClass}
                />
              </div>

              {/* Wallet Kind */}
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Loại ví</span>
                <select
                  value={formWalletKind}
                  onChange={(e) => setFormWalletKind(e.target.value as WalletKind)}
                  className={fieldClass}
                >
                  <option value="cash">Tiền mặt (Cash)</option>
                  <option value="bank">Ngân hàng (Bank)</option>
                  <option value="ewallet">Ví điện tử (E-Wallet)</option>
                  <option value="credit_card">Thẻ tín dụng (Credit Card)</option>
                  <option value="saving">Tiết kiệm (Saving)</option>
                  <option value="investment">Đầu tư (Investment)</option>
                  <option value="other">Khác (Other)</option>
                </select>
              </div>

              {/* Opening Balance */}
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Số dư ban đầu (VND)</span>
                <input
                  type="text"
                  value={formWalletOpening}
                  onChange={(e) => setFormWalletOpening(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className={fieldClass}
                />
                <p className="mt-1 text-xs text-mjm-muted">
                  {Number(formWalletOpening || 0).toLocaleString("vi-VN")} đ
                </p>
              </div>

              {/* Sort Order */}
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Thứ tự sắp xếp</span>
                <input
                  type="number"
                  value={formWalletSortOrder}
                  onChange={(e) => setFormWalletSortOrder(e.target.value)}
                  className={fieldClass}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveWallet}
                  className="rounded-[18px] bg-mjm-accent py-3 font-semibold text-white transition hover:bg-mjm-accent/80 disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu lại"}
                </button>
                {editingWallet ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleDeleteWallet}
                    className="rounded-[18px] border border-mjm-danger/30 bg-mjm-danger/12 py-3 font-semibold text-mjm-danger transition hover:bg-mjm-danger/20 disabled:opacity-50"
                  >
                    Xóa bỏ
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeWalletSheet}
                    className="rounded-[18px] border border-white/10 bg-white/[0.03] py-3 font-semibold text-mjm-text transition hover:bg-white/[0.08]"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0d1420]/95 border border-white/10 px-4 py-2 text-xs font-semibold text-mjm-text shadow-lg animate-fade-in backdrop-blur-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
