import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { useApp } from "@/context/AppContext";
import { fetchTransactionsEnriched, softDeleteTransaction, updateTransaction } from "@/services/transaction.service";
import { monthStart } from "@/lib/date";

type Row = {
  id: string;
  transaction_date: string;
  type: "thu" | "chi";
  amount: number;
  note: string;
  category_id: string | null;
  category_name: string | null;
  wallet_id: string | null;
  wallet_name_vi: string | null;
};

export function HistoryPage() {
  const { telegramUserId, ready, error, categories, wallets } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCat, setEditCat] = useState("");
  const [editWallet, setEditWallet] = useState("");
  const [editType, setEditType] = useState<"thu" | "chi">("chi");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !telegramUserId) {
      setLoading(false);
      return;
    }
    const m = monthStart();
    fetchTransactionsEnriched(telegramUserId, { from: m })
      .then((data) => {
        setRows(data as Row[]);
      })
      .finally(() => setLoading(false));
  }, [ready, telegramUserId]);

  useEffect(() => {
    if (!sel) {
      setEditing(false);
      return;
    }
    setEditAmount(String(sel.amount));
    setEditDate(sel.transaction_date);
    setEditNote(sel.note);
    setEditCat(sel.category_id ?? "");
    setEditWallet(sel.wallet_id ?? "");
    setEditType(sel.type === "thu" ? "thu" : "chi");
  }, [sel]);

  const openEdit = () => {
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!sel || !telegramUserId) {
      return;
    }
    const amt = Number.parseInt(editAmount.replace(/\D/g, ""), 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      setToast("Số tiền không hợp lệ");
      setTimeout(() => setToast(null), 2000);
      return;
    }
    const catId = editCat || null;
    const walId = editWallet || null;
    setSaving(true);
    try {
      await updateTransaction(sel.id, {
        amount: amt,
        type: editType,
        category_id: catId,
        wallet_id: walId,
        note: editNote.trim() || sel.note,
        transaction_date: editDate,
        raw_input: `${sel.note} [sửa từ lịch sử]`
      });
      const cat = categories.find((c) => c.id === catId);
      const w = wallets.find((x) => x.id === walId);
      setRows((prev) =>
        prev.map((r) =>
          r.id === sel.id
            ? {
                ...r,
                amount: amt,
                type: editType,
                transaction_date: editDate,
                note: editNote.trim() || r.note,
                category_id: catId,
                category_name: cat?.name ?? r.category_name,
                wallet_id: walId,
                wallet_name_vi: w?.name_vi ?? r.wallet_name_vi
              }
            : r
        )
      );
      setSel((s) =>
        s && s.id === sel.id
          ? {
              ...s,
              amount: amt,
              type: editType,
              transaction_date: editDate,
              note: editNote.trim() || s.note,
              category_id: catId,
              category_name: cat?.name ?? s.category_name,
              wallet_id: walId,
              wallet_name_vi: w?.name_vi ?? s.wallet_name_vi
            }
          : s
      );
      setEditing(false);
      setToast("Đã cập nhật");
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!ready || error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }
  if (loading) {
    return <Loading />;
  }

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (!groups.has(r.transaction_date)) {
      groups.set(r.transaction_date, []);
    }
    groups.get(r.transaction_date)!.push(r);
  }
  const days = [...groups.keys()].sort((a, b) => (a < b ? 1 : -1));

  const catsForType = categories.filter((c) => c.type === editType);

  return (
    <div>
      <PageHeader title="Lịch sử" subtitle="Tháng này — bấm dòng để sửa / xóa" />
      {rows.length === 0 ? (
        <EmptyState title="Chưa có giao dịch" hint="Dùng Nhập nhanh để thêm." />
      ) : (
        <div className="space-y-6">
          {days.map((d) => (
            <section key={d}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mjm-muted">
                {d.split("-").reverse().join("/")}
              </h3>
              <div className="space-y-2">
                {groups.get(d)!.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSel(r)}
                    className="flex w-full items-center justify-between rounded-xl border border-mjm-border bg-mjm-surface px-3 py-2.5 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-mjm-text">
                        {r.category_name ?? "—"} · {r.note || "—"}
                      </p>
                      <p className="text-xs text-mjm-muted">{r.wallet_name_vi ?? "—"}</p>
                    </div>
                    <MoneyText amount={r.amount} type={r.type === "thu" ? "income" : "expense"} signed={r.type === "thu"} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {sel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-mjm-surface p-4 shadow-xl">
            {!editing ? (
              <>
                <p className="text-lg font-bold">
                  <MoneyText amount={sel.amount} type={sel.type === "thu" ? "income" : "expense"} />
                </p>
                <p className="mt-2 text-sm text-mjm-muted">
                  {sel.category_name} · {sel.wallet_name_vi}
                </p>
                <p className="mt-1 text-sm">{sel.note}</p>
                <p className="mt-1 text-xs text-mjm-muted">{sel.transaction_date}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-mjm-border py-2.5 text-sm font-semibold"
                    onClick={() => setSel(null)}
                  >
                    Đóng
                  </button>
                  <button type="button" className="rounded-xl bg-mjm-accent py-2.5 text-sm font-semibold text-white" onClick={openEdit}>
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="col-span-2 rounded-xl bg-mjm-danger/15 py-2.5 text-sm font-semibold text-mjm-danger"
                    onClick={async () => {
                      await softDeleteTransaction(sel.id);
                      setRows((prev) => prev.filter((x) => x.id !== sel.id));
                      setSel(null);
                    }}
                  >
                    Xóa (mềm)
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="font-semibold text-mjm-text">Sửa giao dịch</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType("chi")}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold ${editType === "chi" ? "bg-mjm-expense/15 text-mjm-expense" : "border border-mjm-border"}`}
                  >
                    Chi
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType("thu")}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold ${editType === "thu" ? "bg-mjm-income/15 text-mjm-income" : "border border-mjm-border"}`}
                  >
                    Thu
                  </button>
                </div>
                <label className="block text-xs text-mjm-muted">Số tiền (VND)</label>
                <input
                  className="w-full rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2 text-mjm-text"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  inputMode="numeric"
                />
                <label className="block text-xs text-mjm-muted">Ngày</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
                <label className="block text-xs text-mjm-muted">Danh mục</label>
                <select
                  className="w-full rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2 text-sm"
                  value={editCat}
                  onChange={(e) => setEditCat(e.target.value)}
                >
                  <option value="">—</option>
                  {catsForType.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent_name} → {c.name}
                    </option>
                  ))}
                </select>
                <label className="block text-xs text-mjm-muted">Ví</label>
                <select
                  className="w-full rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2 text-sm"
                  value={editWallet}
                  onChange={(e) => setEditWallet(e.target.value)}
                >
                  <option value="">—</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name_vi}
                    </option>
                  ))}
                </select>
                <label className="block text-xs text-mjm-muted">Ghi chú</label>
                <input
                  className="w-full rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-mjm-border py-2.5 text-sm font-semibold"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Hủy sửa
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-mjm-accent py-2.5 text-sm font-semibold text-white"
                    onClick={() => void saveEdit()}
                    disabled={saving}
                  >
                    {saving ? "…" : "Lưu"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-mjm-text px-4 py-2 text-sm text-mjm-surface shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
