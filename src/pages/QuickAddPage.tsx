import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyText } from "@/components/common/MoneyText";
import { ProgressBar, Pill, Surface } from "@/components/common/Fintech";
import { useApp } from "@/context/AppContext";
import { defaultWalletCodeForType, parseQuickInput } from "@/lib/parser";
import { todayISODate } from "@/lib/date";
import { formatVnd } from "@/lib/money";
import { createTransaction } from "@/services/transaction.service";
import { createTransfer } from "@/services/transfer.service";
import { getJars } from "@/services/report.service";
import type { JarRow, ParsedQuick, ParsedThuChi, ParsedTransfer } from "@/types/domain";

type Mode = "text" | "form" | "transfer";

const fieldClass =
  "w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text placeholder:text-mjm-muted shadow-[0_10px_30px_rgba(2,6,23,0.12)] outline-none transition focus:border-mjm-accent/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-mjm-accent/15";
const quickInputClass =
  "min-h-[88px] w-full rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.025))] p-3.5 text-[14px] leading-6 text-mjm-text placeholder:text-mjm-muted shadow-[0_12px_40px_rgba(2,6,23,0.16)] outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15";
const quickSaveClass =
  "min-h-[88px] rounded-[20px] px-3 py-3 text-center text-sm font-semibold leading-5 transition hover:brightness-110";

function formatPreviewLabel(text: string) {
  return text.trim() || "—";
}

export function QuickAddPage() {
  const { telegramUserId, ready, error, categories, wallets, aliasMap } = useApp();
  const [params] = useSearchParams();
  const initialMode: Mode = params.get("tab") === "transfer" ? "transfer" : params.get("mode") ? "form" : "text";
  const initialType: "thu" | "chi" = params.get("mode") === "thu" ? "thu" : "chi";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [jars, setJars] = useState<JarRow[]>([]);
  const [fType, setFType] = useState<"thu" | "chi">(initialType);
  const [fAmount, setFAmount] = useState("");
  const [fDate, setFDate] = useState(todayISODate());
  const [fCat, setFCat] = useState("");
  const [fWallet, setFWallet] = useState("bank");
  const [fNote, setFNote] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    void getJars()
      .then((data) => {
        if (!cancelled) {
          setJars((data as JarRow[]).map((j) => ({ ...j, target_percent: Number(j.target_percent) })));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJars([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const ctx = useMemo(() => ({ categories, wallets, aliasToCategoryId: aliasMap }), [categories, wallets, aliasMap]);

  const liveParsed = useMemo<ParsedQuick | { error: string } | null>(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }
    return parseQuickInput(trimmed, ctx);
  }, [text, ctx]);

  const resolvedCategory = useMemo(() => {
    if (!liveParsed || "error" in liveParsed || liveParsed.kind !== "thu_chi") {
      return null;
    }
    return (
      categories.find((c) => c.id === liveParsed.categoryId) ??
      categories.find((c) => c.type === liveParsed.type && c.name === liveParsed.categoryName) ??
      null
    );
  }, [liveParsed, categories]);

  const resolvedJar = useMemo(() => {
    if (!resolvedCategory?.jar_id) {
      return null;
    }
    return jars.find((j) => j.id === resolvedCategory.jar_id) ?? null;
  }, [resolvedCategory, jars]);

  const pushToast = (message: string) => {
    if (toastTimerRef.current != null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  if (!ready) {
    return null;
  }
  if (error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }

  const saveTransfer = async (parsed: ParsedTransfer) => {
    const fromW = wallets.find((w) => w.code === parsed.fromWalletCode);
    const toW = wallets.find((w) => w.code === parsed.toWalletCode);
    if (!fromW || !toW) {
      pushToast("Không tìm thấy ví nguồn hoặc ví đích.");
      return;
    }
    await createTransfer(telegramUserId, {
      from_wallet_id: fromW.id,
      to_wallet_id: toW.id,
      amount: parsed.amount,
      fee_amount: parsed.fee_amount,
      transfer_date: parsed.transaction_date,
      note: parsed.note,
      raw_input: parsed.raw
    });
    pushToast(`Đã chuyển ${formatVnd(parsed.amount)} VND`);
  };

  const saveThuChi = async (parsed: ParsedThuChi) => {
    const wallet = wallets.find((w) => w.code === (parsed.walletCode ?? defaultWalletCodeForType()));
    await createTransaction(telegramUserId, {
      amount: parsed.amount,
      type: parsed.type,
      category_id: parsed.categoryId,
      wallet_id: wallet?.id ?? null,
      note: parsed.note,
      raw_input: parsed.raw,
      transaction_date: parsed.transaction_date,
      source: "quick_text"
    });
    pushToast(
      `Đã lưu ${parsed.type === "thu" ? "thu" : "chi"} ${formatVnd(parsed.amount)}${resolvedJar?.name_vi ? ` · ${resolvedJar.name_vi}` : ""}`
    );
  };

  const saveText = async () => {
    const parsed = parseQuickInput(text, ctx);
    if ("error" in parsed) {
      pushToast(parsed.error);
      return;
    }
    try {
      if (parsed.kind === "transfer") {
        await saveTransfer(parsed);
      } else {
        await saveThuChi(parsed);
      }
      setText("");
      inputRef.current?.focus();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : String(e));
    }
  };

  const saveTransferMode = async () => {
    const parsed = parseQuickInput(text, ctx);
    if ("error" in parsed) {
      pushToast(parsed.error);
      return;
    }
    if (parsed.kind !== "transfer") {
      pushToast("Nhập kiểu: chuyển 3tr bank sang tiết kiệm.");
      return;
    }
    try {
      await saveTransfer(parsed);
      setText("");
      inputRef.current?.focus();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : String(e));
    }
  };

  const saveForm = async () => {
    const amt = Number.parseInt(fAmount.replace(/\D/g, ""), 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      pushToast("Số tiền không hợp lệ");
      return;
    }
    const cat = categories.find((c) => c.id === fCat || c.name === fCat);
    const wallet = wallets.find((w) => w.code === fWallet);
    try {
      await createTransaction(telegramUserId, {
        amount: amt,
        type: fType,
        category_id: cat?.id ?? null,
        wallet_id: wallet?.id ?? null,
        note: fNote.trim(),
        raw_input: `[form] ${fNote}`,
        transaction_date: fDate,
        source: "manual"
      });
      setFAmount("");
      setFNote("");
      setFCat("");
      pushToast("Đã lưu");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : String(e));
    }
  };

  const textPreview = (() => {
    if (!text.trim()) {
      return null;
    }
    if (liveParsed && "error" in liveParsed) {
      return (
        <div className="rounded-[22px] border border-mjm-expense/20 bg-mjm-expense/10 p-4">
          <p className="text-sm font-semibold text-mjm-expense">Chưa nhận diện được nội dung</p>
          <p className="mt-1 text-sm leading-6 text-mjm-muted">{liveParsed.error}</p>
        </div>
      );
    }
    if (!liveParsed) {
      return null;
    }
    if (liveParsed.kind === "transfer") {
      return (
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Pill tone="accent">Chuyển ví</Pill>
            </div>
            <MoneyText amount={liveParsed.amount} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Từ</p>
              <p className="mt-1 font-semibold text-mjm-text">{liveParsed.fromWalletCode ?? "—"}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Sang</p>
              <p className="mt-1 font-semibold text-mjm-text">{liveParsed.toWalletCode ?? "—"}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ngày</p>
              <p className="mt-1 font-semibold text-mjm-text">{liveParsed.transaction_date}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ghi chú</p>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-mjm-text">{formatPreviewLabel(liveParsed.note)}</p>
            </div>
          </div>
        </div>
      );
    }

    const jarName = resolvedJar?.name_vi ?? "Không gắn hũ";
    return (
      <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Pill tone={liveParsed.type === "thu" ? "income" : "expense"}>{liveParsed.type === "thu" ? "Thu" : "Chi"}</Pill>
          </div>
          <MoneyText amount={liveParsed.amount} type={liveParsed.type === "thu" ? "income" : "expense"} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Danh mục</p>
            <p className="mt-1 font-semibold text-mjm-text">{liveParsed.categoryName ?? "—"}</p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Hũ</p>
            <p className="mt-1 font-semibold text-mjm-text">{jarName}</p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ví</p>
            <p className="mt-1 font-semibold text-mjm-text">{liveParsed.walletCode ?? defaultWalletCodeForType()}</p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ngày</p>
            <p className="mt-1 font-semibold text-mjm-text">{liveParsed.transaction_date}</p>
          </div>
        </div>
      </div>
    );
  })();

  return (
    <div className="space-y-5 pb-28">
      <PageHeader title="Nhập nhanh" />

      <Surface className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["text", "Text", "Nhập câu tự nhiên"],
              ["form", "Form", "Điền từng trường"],
              ["transfer", "Chuyển", "Di chuyển tiền giữa ví"]
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-[20px] border px-3 py-3 text-left transition duration-200 ${
                mode === value
                  ? "border-mjm-accent/40 bg-mjm-accent/16 shadow-[0_14px_32px_rgba(91,140,255,0.18)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
              }`}
            >
              <p className="text-sm font-semibold text-mjm-text">{label}</p>
              <p className="mt-1 text-xs leading-5 text-mjm-muted">{hint}</p>
            </button>
          ))}
        </div>
      </Surface>

      {mode === "text" ? (
        <Surface className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-stretch gap-2">
            <textarea
              ref={inputRef}
              className={quickInputClass}
              placeholder="Ví dụ: cf 35k tm, ăn trưa 55k bank, lương 20tr bank"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void saveText()}
              className={`${quickSaveClass} bg-mjm-accent text-white shadow-[0_18px_40px_rgba(91,140,255,0.28)]`}
            >
              Lưu luôn
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Cà phê 35k bank", value: "cf 35k bank" },
              { label: "Ăn trưa 55k bank", value: "ăn trưa 55k bank" },
              { label: "Lương 20tr bank", value: "lương 20tr bank" },
              { label: "Chuyển 3tr...", value: "chuyển 3tr bank sang tiết kiệm" }
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setText(item.value);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs font-semibold text-mjm-text transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                {item.label}
              </button>
            ))}
          </div>

          {textPreview}
        </Surface>
      ) : null}

      {mode === "transfer" ? (
        <Surface className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-stretch gap-2">
            <textarea
              ref={inputRef}
              className={quickInputClass}
              placeholder="chuyển 3tr bank sang tiết kiệm"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void saveTransferMode()}
              className={`${quickSaveClass} bg-mjm-income text-[#07140c] shadow-[0_18px_40px_rgba(74,222,128,0.18)]`}
            >
              Lưu chuyển
            </button>
          </div>

          {textPreview}
        </Surface>
      ) : null}

      {mode === "form" ? (
        <Surface className="space-y-4">
          <div>
            <Pill tone={fType === "thu" ? "income" : "expense"}>{fType === "thu" ? "Thu" : "Chi"}</Pill>
            <p className="mt-2 font-display text-[1.25rem] font-semibold tracking-[-0.03em] text-mjm-text">Form tối giản cho thao tác nhanh</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFType("chi")}
              className={`rounded-[18px] border px-4 py-3 font-semibold transition ${
                fType === "chi"
                  ? "border-mjm-expense/30 bg-mjm-expense/14 text-mjm-expense"
                  : "border-white/10 bg-white/[0.03] text-mjm-muted"
              }`}
            >
              Chi
            </button>
            <button
              type="button"
              onClick={() => setFType("thu")}
              className={`rounded-[18px] border px-4 py-3 font-semibold transition ${
                fType === "thu"
                  ? "border-mjm-income/30 bg-mjm-income/14 text-mjm-income"
                  : "border-white/10 bg-white/[0.03] text-mjm-muted"
              }`}
            >
              Thu
            </button>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Số tiền</span>
            <input
              className={fieldClass}
              value={fAmount}
              onChange={(e) => setFAmount(e.target.value)}
              inputMode="numeric"
              placeholder="35000"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ngày</span>
              <input type="date" className={fieldClass} value={fDate} onChange={(e) => setFDate(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ví</span>
              <select className={fieldClass} value={fWallet} onChange={(e) => setFWallet(e.target.value)}>
                {wallets.map((w) => (
                  <option key={w.id} value={w.code}>
                    {w.name_vi}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Danh mục</span>
            <select className={fieldClass} value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="">—</option>
              {categories
                .filter((c) => c.type === fType)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_name} → {c.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ghi chú</span>
            <input className={fieldClass} value={fNote} onChange={(e) => setFNote(e.target.value)} placeholder="Cà phê, ăn trưa, lương..." />
          </label>

          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between text-xs text-mjm-muted">
              <span>Tiến độ thao tác</span>
              <span>{fType === "thu" ? "Thu" : "Chi"} form</span>
            </div>
            <ProgressBar value={fAmount ? 72 : 28} tone={fType === "thu" ? "income" : "expense"} className="mt-3" />
          </div>

          <button
            type="button"
            onClick={() => void saveForm()}
            className="w-full rounded-[20px] bg-mjm-accent py-3.5 font-semibold text-white shadow-[0_18px_40px_rgba(91,140,255,0.28)]"
          >
            Lưu giao dịch
          </button>
        </Surface>
      ) : null}

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-full border border-white/10 bg-[#0d1420]/95 px-4 py-2 text-sm font-medium text-mjm-text shadow-[0_20px_50px_rgba(2,6,23,0.45)] backdrop-blur-2xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
