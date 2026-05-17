import { useEffect, useMemo, useRef, useState } from "react";
import { formatVnd } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { WalletBalanceRow, WalletReconciliationResult } from "@/types/domain";
import { Pill } from "@/components/common/Fintech";

const fieldClass =
  "w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-lg font-semibold tabular-nums tracking-[-0.03em] text-mjm-text outline-none transition placeholder:text-mjm-muted focus:border-mjm-accent/45 focus:ring-4 focus:ring-mjm-accent/15";

function toDigitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatDigitsAsVnd(value: string) {
  if (!value) {
    return "";
  }
  return new Intl.NumberFormat("vi-VN").format(Number(value));
}

export function WalletReconciliationDialog({
  open,
  wallet,
  targetJarId = null,
  onClose,
  onConfirm
}: {
  open: boolean;
  wallet: WalletBalanceRow | null;
  targetJarId?: string | null;
  onClose: () => void;
  onConfirm: (payload: { actualBalance: number; targetJarId: string | null }) => Promise<WalletReconciliationResult>;
}) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [actualDigits, setActualDigits] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !wallet) {
      setActualDigits("");
      setError(null);
      setSubmitting(false);
      return;
    }
    setActualDigits(String(Math.max(0, Math.round(wallet.current_balance))));
    setError(null);
  }, [open, wallet]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerOutside = (event: Event) => {
      const target = event.target;
      const modal = modalRef.current;
      if (!(target instanceof Node) || !modal) {
        return;
      }
      if (modal.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerOutside, true);
    document.addEventListener("touchstart", handlePointerOutside, true);
    document.addEventListener("mousedown", handlePointerOutside, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerOutside, true);
      document.removeEventListener("touchstart", handlePointerOutside, true);
      document.removeEventListener("mousedown", handlePointerOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const actualBalance = useMemo(() => {
    if (!actualDigits) {
      return 0;
    }
    return Number(actualDigits);
  }, [actualDigits]);

  const delta = useMemo(() => {
    if (!wallet) {
      return 0;
    }
    return actualBalance - wallet.current_balance;
  }, [actualBalance, wallet]);

  const adjustmentTone = delta > 0 ? "income" : delta < 0 ? "expense" : "neutral";

  const deltaText =
    delta === 0
      ? "Số dư thực tế đang khớp hoàn toàn với ứng dụng."
      : `Hệ thống sẽ tự bù lệch: ${delta > 0 ? "+" : "-"}${formatVnd(Math.abs(delta))}đ`;

  const handleSubmit = async () => {
    if (!wallet) {
      return;
    }
    if (!actualDigits) {
      setError("Bạn cần nhập số dư thực tế.");
      return;
    }
    const nextActual = Number(actualDigits);
    if (!Number.isFinite(nextActual) || nextActual < 0) {
      setError("Số dư thực tế không hợp lệ.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        actualBalance: nextActual,
        targetJarId
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể chốt số dư lúc này.");
      setSubmitting(false);
    }
  };

  if (!open || !wallet) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="wallet-reconcile-title">
      <div aria-hidden="true" className="absolute inset-0 bg-black/65 backdrop-blur-md" />

      <div className="absolute inset-x-0 bottom-0 flex justify-center px-4 pb-6 pt-20">
        <div
          ref={modalRef}
          className="w-full max-w-[430px] rounded-[32px] border border-white/10 bg-[#0a111b]/95 p-5 shadow-[0_36px_120px_rgba(2,6,23,0.62)] backdrop-blur-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-mjm-muted">Reconciliation</p>
              <h2 id="wallet-reconcile-title" className="mt-2 font-display text-[1.45rem] font-semibold tracking-[-0.03em] text-mjm-text">
                Chốt số dư thực tế
              </h2>
              <p className="mt-2 text-sm leading-6 text-mjm-muted">
                {wallet.name_vi} • {wallet.code.toUpperCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-mjm-text transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Đóng
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-mjm-muted">Số dư trên app</p>
              <p className="mt-3 font-display text-[1.75rem] font-semibold tracking-[-0.04em] text-mjm-text">{formatVnd(wallet.current_balance)}đ</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-mjm-muted">Kết quả điều chỉnh</p>
              <div className="mt-3 flex items-center gap-2">
                <Pill tone={adjustmentTone === "income" ? "income" : adjustmentTone === "expense" ? "expense" : "neutral"}>
                  {delta > 0 ? "Thu bù lệch" : delta < 0 ? "Chi bù lệch" : "Không phát sinh"}
                </Pill>
              </div>
              <p
                className={cn(
                  "mt-3 font-display text-[1.2rem] font-semibold tracking-[-0.03em]",
                  adjustmentTone === "income" ? "text-mjm-income" : adjustmentTone === "expense" ? "text-mjm-expense" : "text-mjm-text"
                )}
              >
                {delta > 0 ? "+" : delta < 0 ? "-" : ""}
                {formatVnd(Math.abs(delta))}đ
              </p>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-mjm-muted">Số dư thực tế</span>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={formatDigitsAsVnd(actualDigits)}
              onChange={(event) => {
                setActualDigits(toDigitsOnly(event.target.value));
                setError(null);
              }}
              placeholder="Nhập số tiền thực tế"
              className={fieldClass}
            />
          </label>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-mjm-muted">Ảnh hưởng hệ thống</p>
            <p
              className={cn(
                "mt-3 text-sm leading-6",
                adjustmentTone === "income" ? "text-mjm-income" : adjustmentTone === "expense" ? "text-mjm-expense" : "text-mjm-text"
              )}
            >
              {deltaText}
            </p>
            <p className="mt-2 text-xs leading-5 text-mjm-muted">
              Giao dịch điều chỉnh sẽ được gắn cờ hệ thống để có thể loại khỏi các biểu đồ phân tích thói quen chi tiêu.
            </p>
          </div>

          {error ? <p className="mt-4 text-sm text-mjm-expense">{error}</p> : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-mjm-text transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Để sau
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-[22px] border border-mjm-accent/40 bg-mjm-accent px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_46px_rgba(88,132,255,0.34)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Đang chốt số..." : "Xác nhận chốt số"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
