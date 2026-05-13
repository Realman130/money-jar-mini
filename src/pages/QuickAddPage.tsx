import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyText } from "@/components/common/MoneyText";
import { Surface, Pill, SectionHeader, ProgressBar } from "@/components/common/Fintech";
import { useApp } from "@/context/AppContext";
import { parseQuickInput, defaultWalletCodeForType } from "@/lib/parser";
import { createTransaction } from "@/services/transaction.service";
import { createTransfer } from "@/services/transfer.service";
import type { ParsedQuick, ParsedThuChi } from "@/types/domain";
import { todayISODate } from "@/lib/date";

type Mode = "text" | "form" | "transfer";

const fieldClass =
  "w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text placeholder:text-mjm-muted shadow-[0_10px_30px_rgba(2,6,23,0.12)] outline-none transition focus:border-mjm-accent/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-mjm-accent/15";

export function QuickAddPage() {
  const { telegramUserId, ready, error, categories, wallets, aliasMap } = useApp();
  const [params] = useSearchParams();
  const initialMode: Mode = params.get("tab") === "transfer" ? "transfer" : params.get("mode") ? "form" : "text";
  const initialType: "thu" | "chi" = params.get("mode") === "thu" ? "thu" : "chi";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuick | { error: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ctx = useMemo(() => ({ categories, wallets, aliasToCategoryId: aliasMap }), [categories, wallets, aliasMap]);

  const [fType, setFType] = useState<"thu" | "chi">(initialType);
  const [fAmount, setFAmount] = useState("");
  const [fDate, setFDate] = useState(todayISODate());
  const [fCat, setFCat] = useState("");
  const [fWallet, setFWallet] = useState("bank");
  const [fNote, setFNote] = useState("");

  const presetTemplates = [
    { label: "Cà phê 35k bank", value: "cf 35k bank" },
    { label: "Ăn trưa 55k bank", value: "ăn trưa 55k bank" },
    { label: "Lương 20tr bank", value: "lương 20tr bank" },
    { label: "Chuyển 3tr bank sang tiết kiệm", value: "chuyển 3tr bank sang tiết kiệm" }
  ];

  if (!ready) {
    return null;
  }
  if (error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }

  const clearToast = () => {
    window.setTimeout(() => setToast(null), 2600);
  };

  const onParse = () => {
    const r = parseQuickInput(text, ctx);
    setParsed(r);
  };

  const onSave = async () => {
    if (!parsed || "error" in parsed) {
      return;
    }
    try {
      if (parsed.kind === "transfer") {
        const fromW = wallets.find((w) => w.code === parsed.fromWalletCode);
        const toW = wallets.find((w) => w.code === parsed.toWalletCode);
        if (!fromW || !toW) {
          setToast("Không tìm thấy ví nguồn hoặc ví đích.");
          clearToast();
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
        setToast(`Đã chuyển ${parsed.amount.toLocaleString("vi-VN")} VND`);
      } else {
        const p = parsed as ParsedThuChi;
        const w = wallets.find((x) => x.code === (p.walletCode ?? defaultWalletCodeForType()));
        await createTransaction(telegramUserId, {
          amount: p.amount,
          type: p.type,
          category_id: p.categoryId,
          wallet_id: w?.id ?? null,
          note: p.note,
          raw_input: p.raw,
          transaction_date: p.transaction_date,
          source: "quick_text"
        });
        setToast(`Đã lưu giao dịch ${p.amount.toLocaleString("vi-VN")} VND`);
      }
      setText("");
      setParsed(null);
      inputRef.current?.focus();
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
    clearToast();
  };

  const saveForm = async () => {
    const amt = Number.parseInt(fAmount.replace(/\D/g, ""), 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      setToast("Số tiền không hợp lệ");
      clearToast();
      return;
    }
    const cat = categories.find((c) => c.id === fCat || c.name === fCat);
    const w = wallets.find((x) => x.code === fWallet);
    try {
      await createTransaction(telegramUserId, {
        amount: amt,
        type: fType,
        category_id: cat?.id ?? null,
        wallet_id: w?.id ?? null,
        note: fNote.trim(),
        raw_input: `[form] ${fNote}`,
        transaction_date: fDate,
        source: "manual"
      });
      setToast("Đã lưu");
      setFAmount("");
      setFNote("");
      setFCat("");
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
    clearToast();
  };

  const updatePreset = (value: string) => {
    setText(value);
    setParsed(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const hasError = parsed != null && "error" in parsed;

  return (
    <div className="space-y-5">
      <PageHeader title="Nhập nhanh" subtitle="Text, form, hoặc chuyển ví trong cùng một flow." kicker="Capture" />

      <Surface className="space-y-4">
        <SectionHeader title="Tốc độ nhập" subtitle="Chọn cách bạn muốn ghi giao dịch." />
        <div className="grid grid-cols-3 gap-2">
          {([
            ["text", "Text", "Nhập câu tự nhiên"],
            ["form", "Form", "Điền từng trường"],
            ["transfer", "Chuyển", "Di chuyển tiền giữa ví"]
          ] as const).map(([value, label, hint]) => (
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
        <div className="space-y-5">
          <Surface className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Pill tone="accent">AI parsing</Pill>
                <p className="mt-2 font-display text-[1.3rem] font-semibold tracking-[-0.03em] text-mjm-text">Gõ một câu, app tự hiểu giao dịch.</p>
              </div>
              <div className="hidden rounded-[20px] border border-white/10 bg-white/[0.03] px-3 py-2 text-right sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ví dụ</p>
                <p className="text-sm text-mjm-text">cf 35k bank</p>
              </div>
            </div>

            <textarea
              ref={inputRef}
              className="min-h-[160px] w-full rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.025))] p-4 text-[15px] leading-7 text-mjm-text placeholder:text-mjm-muted shadow-[0_12px_40px_rgba(2,6,23,0.16)] outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15"
              placeholder="Ví dụ: cf 35k tm, ăn trưa 55k bank, lương 20tr bank"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {presetTemplates.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => updatePreset(item.value)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs font-semibold text-mjm-text transition hover:border-white/15 hover:bg-white/[0.05]"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onParse}
              className="w-full rounded-[20px] bg-mjm-accent py-3.5 font-semibold text-white shadow-[0_18px_40px_rgba(91,140,255,0.28)] transition hover:brightness-110"
            >
              Phân tích giao dịch
            </button>
          </Surface>

          {parsed && hasError ? (
            <Surface className="border-mjm-expense/30 bg-mjm-expense/8">
              <p className="text-sm font-semibold text-mjm-expense">Chưa phân tích được</p>
              <p className="mt-1 text-sm leading-6 text-mjm-muted">{parsed.error}</p>
            </Surface>
          ) : null}

          {parsed && !hasError && parsed.kind === "transfer" ? (
            <Surface className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Pill tone="accent">Transfer</Pill>
                  <p className="mt-2 font-display text-[1.15rem] font-semibold tracking-[-0.03em] text-mjm-text">Chuyển ví đã nhận diện</p>
                </div>
                <MoneyText amount={parsed.amount} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Từ</p>
                  <p className="mt-1 font-semibold text-mjm-text">{parsed.fromWalletCode ?? "—"}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Sang</p>
                  <p className="mt-1 font-semibold text-mjm-text">{parsed.toWalletCode ?? "—"}</p>
                </div>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ngày</p>
                <p className="mt-1 font-semibold text-mjm-text">{parsed.transaction_date}</p>
                <ProgressBar value={100} tone="accent" className="mt-3" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onSave}
                  className="flex-1 rounded-[18px] bg-mjm-income py-3.5 font-semibold text-[#07140c] shadow-[0_16px_32px_rgba(74,222,128,0.18)]"
                >
                  Lưu chuyển ví
                </button>
                <button
                  type="button"
                  onClick={() => setParsed(null)}
                  className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3.5 font-semibold text-mjm-text"
                >
                  Bỏ qua
                </button>
              </div>
            </Surface>
          ) : null}

          {parsed && !hasError && parsed.kind === "thu_chi" ? (
            <Surface className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Pill tone={parsed.type === "thu" ? "income" : "expense"}>{parsed.type === "thu" ? "Thu" : "Chi"}</Pill>
                  <p className="mt-2 font-display text-[1.15rem] font-semibold tracking-[-0.03em] text-mjm-text">Giao dịch đã được tách trường</p>
                </div>
                <MoneyText amount={parsed.amount} type={parsed.type === "thu" ? "income" : "expense"} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Danh mục</p>
                  <p className="mt-1 font-semibold text-mjm-text">{parsed.categoryName ?? "—"}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ví</p>
                  <p className="mt-1 font-semibold text-mjm-text">{parsed.walletCode ?? defaultWalletCodeForType()}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ngày</p>
                  <p className="mt-1 font-semibold text-mjm-text">{parsed.transaction_date}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ghi chú</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-mjm-text">{parsed.note || "—"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onSave}
                  className="flex-1 rounded-[18px] bg-mjm-accent py-3.5 font-semibold text-white shadow-[0_18px_40px_rgba(91,140,255,0.28)]"
                >
                  Lưu giao dịch
                </button>
                <button
                  type="button"
                  onClick={() => setParsed(null)}
                  className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3.5 font-semibold text-mjm-text"
                >
                  Bỏ qua
                </button>
              </div>
            </Surface>
          ) : null}
        </div>
      ) : null}

      {mode === "transfer" ? (
        <Surface className="space-y-4">
          <div>
            <Pill tone="accent">Transfer flow</Pill>
            <p className="mt-2 font-display text-[1.25rem] font-semibold tracking-[-0.03em] text-mjm-text">Chuyển tiền giữa các ví</p>
            <p className="mt-1 text-sm leading-6 text-mjm-muted">Ví dụ: chuyển 3tr bank sang tiết kiệm</p>
          </div>
          <textarea
            ref={inputRef}
            className="min-h-[150px] w-full rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-[15px] leading-7 text-mjm-text placeholder:text-mjm-muted outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15"
            placeholder="chuyển 3tr bank sang tiết kiệm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            onClick={onParse}
            className="w-full rounded-[20px] bg-mjm-accent py-3.5 font-semibold text-white shadow-[0_18px_40px_rgba(91,140,255,0.28)]"
          >
            Phân tích chuyển ví
          </button>
          {parsed && hasError ? (
            <p className="text-sm font-medium text-mjm-expense">{parsed.error}</p>
          ) : null}
          {parsed && !hasError && parsed.kind === "transfer" ? (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Đã nhận diện</p>
                  <p className="mt-1 text-sm font-semibold text-mjm-text">
                    {parsed.fromWalletCode} → {parsed.toWalletCode}
                  </p>
                </div>
                <MoneyText amount={parsed.amount} />
              </div>
              <p className="mt-3 text-sm leading-6 text-mjm-muted">Ngày: {parsed.transaction_date}</p>
              <button
                type="button"
                onClick={onSave}
                className="mt-4 w-full rounded-[18px] bg-mjm-income py-3.5 font-semibold text-[#07140c]"
              >
                Lưu chuyển ví
              </button>
            </div>
          ) : null}
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
            onClick={saveForm}
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
