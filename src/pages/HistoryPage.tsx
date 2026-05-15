import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { Surface, Pill, MetricCard, ProgressBar, SectionHeader } from "@/components/common/Fintech";
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

const fieldClass =
  "w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text placeholder:text-mjm-muted outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15";

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
  const [filter, setFilter] = useState<"all" | "thu" | "chi">("all");
  const [query, setQuery] = useState("");
  const modalRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!sel) {
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
      closeSheet();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSheet();
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
  }, [sel]);

  const catMap = useMemo(() => {
    const map = new Map<string, (typeof categories)[number]>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.type !== filter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return [row.note, row.category_name, row.wallet_name_vi, row.transaction_date].some((value) => value?.toLowerCase().includes(q));
    });
  }, [rows, filter, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const row of filteredRows) {
      if (!groups.has(row.transaction_date)) {
        groups.set(row.transaction_date, []);
      }
      groups.get(row.transaction_date)!.push(row);
    }
    return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filteredRows]);

  const totalExpense = rows.filter((r) => r.type === "chi").reduce((sum, row) => sum + row.amount, 0);
  const averageExpense = rows.filter((r) => r.type === "chi").length > 0 ? Math.round(totalExpense / rows.filter((r) => r.type === "chi").length) : 0;

  const openEdit = () => {
    setEditing(true);
  };

  const closeSheet = () => {
    setEditing(false);
    setSel(null);
  };

  const saveEdit = async () => {
    if (!sel || !telegramUserId) {
      return;
    }
    const amt = Number.parseInt(editAmount.replace(/\D/g, ""), 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      setToast("Số tiền không hợp lệ");
      window.setTimeout(() => setToast(null), 2000);
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
      window.setTimeout(() => setToast(null), 2000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
      window.setTimeout(() => setToast(null), 3000);
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

  const rowsCount = rows.length;
  const chiCount = rows.filter((r) => r.type === "chi").length;
  const thuCount = rows.filter((r) => r.type === "thu").length;
  const typeTone = filter === "thu" ? "income" : filter === "chi" ? "expense" : "accent";

  return (
    <div className="space-y-5">
      <PageHeader title="Lịch sử" subtitle="Bấm một dòng để xem, sửa, hoặc xoá mềm." kicker="Timeline" />

      <Surface className="space-y-4">
        <SectionHeader
          title="Dòng tiền tháng này"
          subtitle="Một timeline ngắn gọn để scan giao dịch nhanh hơn."
          action={<Pill tone={typeTone}>{filter === "all" ? "Tất cả" : filter === "thu" ? "Thu" : "Chi"}</Pill>}
        />
        <div className="grid grid-cols-3 gap-2">
          <MetricCard label="Giao dịch" value={rowsCount.toLocaleString("vi-VN")} hint="Tổng số dòng" className="p-3" />
          <MetricCard label="Thu" value={thuCount.toLocaleString("vi-VN")} tone="income" hint="Dòng thu" className="p-3" />
          <MetricCard label="Chi" value={chiCount.toLocaleString("vi-VN")} tone="expense" hint="Dòng chi" className="p-3" />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Tìm kiếm</span>
            <input
              className={fieldClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo ghi chú, danh mục, ví, ngày..."
            />
          </label>
          <div className="grid grid-cols-3 gap-2 self-end">
            {([
              ["all", "Tất cả"],
              ["chi", "Chi"],
              ["thu", "Thu"]
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-[18px] border px-3 py-3 text-sm font-semibold transition ${
                  filter === value
                    ? "border-mjm-accent/30 bg-mjm-accent/16 text-white"
                    : "border-white/10 bg-white/[0.03] text-mjm-muted hover:border-white/15 hover:bg-white/[0.05]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3 text-xs text-mjm-muted">
            <span>Chi trung bình / dòng chi</span>
            <span>{averageExpense.toLocaleString("vi-VN")} VND</span>
          </div>
          <ProgressBar value={rowsCount > 0 ? Math.min(100, (chiCount / rowsCount) * 100) : 0} tone="expense" className="mt-3" />
        </div>
      </Surface>

      {filteredRows.length === 0 ? (
        <EmptyState title="Không có giao dịch phù hợp" hint="Thử đổi bộ lọc hoặc từ khoá tìm kiếm." />
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => (
            <section key={date} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-mjm-muted">{date.split("-").reverse().join("/")}</h3>
                <span className="text-xs text-mjm-muted">{items.length} giao dịch</span>
              </div>
              <div className="space-y-2">
                {items.map((row) => {
                  const cat = row.category_id ? catMap.get(row.category_id) : null;
                  const icon = cat?.icon ?? (row.type === "thu" ? "↗" : "↙");
                  const iconBg = cat?.color ? `${cat.color}1A` : row.type === "thu" ? "rgba(74,222,128,0.12)" : "rgba(255,116,98,0.12)";
                  const iconColor = cat?.color ?? (row.type === "thu" ? "var(--mjm-income)" : "var(--mjm-expense)");
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSel(row)}
                      className="group flex w-full items-center gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/12 hover:bg-white/[0.05]"
                    >
                      <div
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 text-sm font-bold"
                        style={{ backgroundColor: iconBg, color: iconColor }}
                      >
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-mjm-text">{row.category_name ?? "Không danh mục"}</p>
                            <p className="mt-1 truncate text-sm leading-6 text-mjm-muted">{row.note || "—"}</p>
                          </div>
                          <MoneyText amount={row.amount} type={row.type === "thu" ? "income" : "expense"} />
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-mjm-muted">
                          <Pill tone={row.type === "thu" ? "income" : "expense"}>{row.type === "thu" ? "Thu" : "Chi"}</Pill>
                          <span>{row.wallet_name_vi ?? "—"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {sel ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div aria-hidden="true" className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div
            ref={modalRef}
            className="absolute inset-x-3 bottom-3 mx-auto w-auto max-w-[430px] overflow-hidden rounded-[32px] border border-white/10 bg-[#0c131f]/96 shadow-[0_30px_90px_rgba(2,6,23,0.55)]"
          >
            {!editing ? (
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Pill tone={sel.type === "thu" ? "income" : "expense"}>{sel.type === "thu" ? "Thu" : "Chi"}</Pill>
                    <p className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.04em] text-mjm-text">
                      <MoneyText amount={sel.amount} type={sel.type === "thu" ? "income" : "expense"} />
                    </p>
                    <p className="mt-1 text-sm text-mjm-muted">{sel.transaction_date}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-mjm-text"
                    onClick={closeSheet}
                  >
                    Đóng
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Danh mục</p>
                    <p className="mt-1 font-semibold text-mjm-text">{sel.category_name ?? "—"}</p>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ví</p>
                    <p className="mt-1 font-semibold text-mjm-text">{sel.wallet_name_vi ?? "—"}</p>
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ghi chú</p>
                  <p className="mt-2 text-sm leading-6 text-mjm-text">{sel.note || "—"}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-[18px] bg-mjm-accent py-3.5 font-semibold text-white"
                    onClick={openEdit}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="rounded-[18px] border border-mjm-danger/30 bg-mjm-danger/12 py-3.5 font-semibold text-mjm-danger"
                    onClick={async () => {
                      await softDeleteTransaction(sel.id);
                      setRows((prev) => prev.filter((x) => x.id !== sel.id));
                      setSel(null);
                    }}
                  >
                    Xoá mềm
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Pill tone={editType === "thu" ? "income" : "expense"}>{editType === "thu" ? "Thu" : "Chi"}</Pill>
                    <p className="mt-2 font-display text-[1.25rem] font-semibold tracking-[-0.04em] text-mjm-text">Sửa giao dịch</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-mjm-text"
                    onClick={closeSheet}
                    disabled={saving}
                  >
                    Quay lại
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType("chi")}
                    className={`rounded-[18px] border px-4 py-3 font-semibold transition ${
                      editType === "chi"
                        ? "border-mjm-expense/30 bg-mjm-expense/14 text-mjm-expense"
                        : "border-white/10 bg-white/[0.03] text-mjm-muted"
                    }`}
                  >
                    Chi
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType("thu")}
                    className={`rounded-[18px] border px-4 py-3 font-semibold transition ${
                      editType === "thu"
                        ? "border-mjm-income/30 bg-mjm-income/14 text-mjm-income"
                        : "border-white/10 bg-white/[0.03] text-mjm-muted"
                    }`}
                  >
                    Thu
                  </button>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Số tiền</span>
                  <input className={fieldClass} value={editAmount} onChange={(e) => setEditAmount(e.target.value)} inputMode="numeric" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ngày</span>
                  <input type="date" className={fieldClass} value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Danh mục</span>
                  <select className={fieldClass} value={editCat} onChange={(e) => setEditCat(e.target.value)}>
                    <option value="">—</option>
                    {categories
                      .filter((c) => c.type === editType)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parent_name} → {c.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ví</span>
                  <select className={fieldClass} value={editWallet} onChange={(e) => setEditWallet(e.target.value)}>
                    <option value="">—</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name_vi}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ghi chú</span>
                  <input className={fieldClass} value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                </label>

                <button
                  type="button"
                  className="w-full rounded-[18px] bg-mjm-accent py-3.5 font-semibold text-white disabled:opacity-60"
                  onClick={() => void saveEdit()}
                  disabled={saving}
                >
                  {saving ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-white/10 bg-[#0d1420]/95 px-4 py-2 text-sm font-medium text-mjm-text shadow-[0_20px_50px_rgba(2,6,23,0.45)] backdrop-blur-2xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
