import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyText } from "@/components/common/MoneyText";
import { useApp } from "@/context/AppContext";
import { parseQuickInput, defaultWalletCodeForType } from "@/lib/parser";
import { createTransaction } from "@/services/transaction.service";
import { createTransfer } from "@/services/transfer.service";
import type { ParsedQuick, ParsedThuChi } from "@/types/domain";
import { todayISODate } from "@/lib/date";

export function QuickAddPage() {
  const { telegramUserId, ready, error, categories, wallets, aliasMap } = useApp();
  const [params] = useSearchParams();
  const tab = params.get("tab") === "transfer" ? "transfer" : "text";
  const [mode, setMode] = useState<"text" | "form">("text");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuick | { error: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ctx = useMemo(() => ({ categories, wallets, aliasToCategoryId: aliasMap }), [categories, wallets, aliasMap]);

  if (!ready) {
    return null;
  }
  if (error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }

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
          setToast("Không tìm thấy ví nguồn/đích.");
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
        setToast(`Đã chuyển ${parsed.amount.toLocaleString("vi-VN")}`);
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
        setToast(`Đã lưu giao dịch ${p.amount.toLocaleString("vi-VN")}${p.categoryName ? ` · ${p.categoryName}` : ""}`);
      }
      setText("");
      setParsed(null);
      inputRef.current?.focus();
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
    setTimeout(() => setToast(null), 3200);
  };

  /* Form mode — tối giản */
  const [fType, setFType] = useState<"thu" | "chi">("chi");
  const [fAmount, setFAmount] = useState("");
  const [fDate, setFDate] = useState(todayISODate());
  const [fCat, setFCat] = useState("");
  const [fWallet, setFWallet] = useState("bank");
  const [fNote, setFNote] = useState("");

  const saveForm = async () => {
    const amt = Number.parseInt(fAmount.replace(/\D/g, ""), 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      setToast("Số tiền không hợp lệ");
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
        note: fNote,
        raw_input: `[form] ${fNote}`,
        transaction_date: fDate,
        source: "manual"
      });
      setToast("Đã lưu");
      setFAmount("");
      setFNote("");
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
    setTimeout(() => setToast(null), 2500);
  };

  if (tab === "transfer") {
    return (
      <div>
        <PageHeader title="Chuyển ví" subtitle="Ví dụ: chuyển 3tr bank sang tiết kiệm" />
        <textarea
          ref={inputRef}
          className="mb-3 min-h-[100px] w-full rounded-2xl border border-mjm-border bg-mjm-surface p-4 text-base text-mjm-text placeholder:text-mjm-muted"
          placeholder="chuyển 3tr bank sang tiết kiệm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="button" onClick={onParse} className="mb-2 w-full rounded-xl bg-mjm-accent py-3 font-semibold text-white">
          Phân tích
        </button>
        {parsed && "error" in parsed ? <p className="text-sm text-mjm-expense">{parsed.error}</p> : null}
        {parsed && !("error" in parsed) && parsed.kind === "transfer" ? (
          <div className="mt-3 space-y-2 rounded-2xl border border-mjm-border bg-mjm-surface p-4 text-sm">
            <p>
              Số tiền: <MoneyText amount={parsed.amount} />
            </p>
            <p>
              Từ: {parsed.fromWalletCode} → {parsed.toWalletCode}
            </p>
            <p>Ngày: {parsed.transaction_date}</p>
            <button type="button" onClick={onSave} className="mt-2 w-full rounded-xl bg-mjm-income py-3 font-semibold text-white">
              Lưu chuyển ví
            </button>
          </div>
        ) : null}
        {toast ? <p className="mt-3 text-center text-sm text-mjm-muted">{toast}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Nhập nhanh" subtitle="Text hoặc form — tối ưu mobile" />
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold ${mode === "text" ? "bg-mjm-accent text-white" : "bg-mjm-surface border border-mjm-border"}`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => setMode("form")}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold ${mode === "form" ? "bg-mjm-accent text-white" : "bg-mjm-surface border border-mjm-border"}`}
        >
          Form
        </button>
      </div>

      {mode === "text" ? (
        <>
          <textarea
            ref={inputRef}
            className="mb-3 min-h-[120px] w-full rounded-2xl border border-mjm-border bg-mjm-surface p-4 text-base text-mjm-text placeholder:text-mjm-muted"
            placeholder="Ví dụ: cf 35k tm, ăn trưa 55k bank, lương 20tr bank"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="button" onClick={onParse} className="mb-2 w-full rounded-xl bg-mjm-accent py-3 font-semibold text-white">
            Phân tích
          </button>
          {parsed && "error" in parsed ? <p className="text-sm text-mjm-expense">{parsed.error}</p> : null}
          {parsed && !("error" in parsed) && parsed.kind === "transfer" ? (
            <div className="mt-3 space-y-2 rounded-2xl border border-mjm-border bg-mjm-surface p-4 text-sm">
              <p className="font-semibold">Chuyển ví</p>
              <p>
                Số tiền: <MoneyText amount={parsed.amount} />
              </p>
              <p>
                {parsed.fromWalletCode} → {parsed.toWalletCode}
              </p>
              <p>Ngày: {parsed.transaction_date}</p>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={onSave} className="flex-1 rounded-xl bg-mjm-accent py-3 font-semibold text-white">
                  Lưu
                </button>
                <button type="button" onClick={() => setParsed(null)} className="flex-1 rounded-xl border border-mjm-border py-3 font-semibold">
                  Hủy
                </button>
              </div>
            </div>
          ) : null}
          {parsed && !("error" in parsed) && parsed.kind === "thu_chi" ? (
            <div className="mt-3 space-y-2 rounded-2xl border border-mjm-border bg-mjm-surface p-4 text-sm">
              <p>Loại: {parsed.type === "thu" ? "Thu" : "Chi"}</p>
              <p>
                Số tiền: <MoneyText amount={parsed.amount} type={parsed.type === "thu" ? "income" : "expense"} />
              </p>
              <p>Danh mục: {parsed.categoryName}</p>
              <p>Ví: {parsed.walletCode}</p>
              <p>Ngày: {parsed.transaction_date}</p>
              <p className="text-mjm-muted">Ghi chú: {parsed.note}</p>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={onSave} className="flex-1 rounded-xl bg-mjm-income py-3 font-semibold text-white">
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => setParsed(null)}
                  className="flex-1 rounded-xl border border-mjm-border py-3 font-semibold"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-3 rounded-2xl border border-mjm-border bg-mjm-surface p-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFType("chi")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${fType === "chi" ? "bg-mjm-expense/15 text-mjm-expense" : ""}`}
            >
              Chi
            </button>
            <button
              type="button"
              onClick={() => setFType("thu")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${fType === "thu" ? "bg-mjm-income/15 text-mjm-income" : ""}`}
            >
              Thu
            </button>
          </div>
          <label className="block text-xs text-mjm-muted">Số tiền (VD 35000)</label>
          <input
            className="w-full rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2 text-mjm-text"
            value={fAmount}
            onChange={(e) => setFAmount(e.target.value)}
            inputMode="numeric"
          />
          <label className="block text-xs text-mjm-muted">Ngày</label>
          <input
            type="date"
            className="w-full rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2 text-mjm-text"
            value={fDate}
            onChange={(e) => setFDate(e.target.value)}
          />
          <label className="block text-xs text-mjm-muted">Danh mục (chọn id hoặc để trống)</label>
          <select
            className="w-full rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2 text-sm text-mjm-text"
            value={fCat}
            onChange={(e) => setFCat(e.target.value)}
          >
            <option value="">—</option>
            {categories
              .filter((c) => c.type === fType)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_name} → {c.name}
                </option>
              ))}
          </select>
          <label className="block text-xs text-mjm-muted">Ví</label>
          <select
            className="w-full rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2 text-sm"
            value={fWallet}
            onChange={(e) => setFWallet(e.target.value)}
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.code}>
                {w.name_vi}
              </option>
            ))}
          </select>
          <label className="block text-xs text-mjm-muted">Ghi chú</label>
          <input
            className="w-full rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2"
            value={fNote}
            onChange={(e) => setFNote(e.target.value)}
          />
          <button type="button" onClick={saveForm} className="w-full rounded-xl bg-mjm-accent py-3 font-semibold text-white">
            Lưu
          </button>
        </div>
      )}

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-full bg-mjm-text px-4 py-2 text-sm text-mjm-surface shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
