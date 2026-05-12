import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { useApp } from "@/context/AppContext";
import { fetchTransactionsEnriched, softDeleteTransaction } from "@/services/transaction.service";
import { monthStart } from "@/lib/date";

type Row = {
  id: string;
  transaction_date: string;
  type: string;
  amount: number;
  note: string;
  category_name: string | null;
  wallet_name_vi: string | null;
};

export function HistoryPage() {
  const { telegramUserId, ready, error } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Row | null>(null);

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

  return (
    <div>
      <PageHeader title="Lịch sử" subtitle="Tháng này" />
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
          <div className="w-full max-w-lg rounded-t-2xl bg-mjm-surface p-4 shadow-xl">
            <p className="text-lg font-bold">
              <MoneyText amount={sel.amount} type={sel.type === "thu" ? "income" : "expense"} />
            </p>
            <p className="mt-2 text-sm text-mjm-muted">
              {sel.category_name} · {sel.wallet_name_vi}
            </p>
            <p className="mt-1 text-sm">{sel.note}</p>
            <p className="mt-1 text-xs text-mjm-muted">{sel.transaction_date}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-mjm-border py-2 text-sm font-semibold"
                onClick={() => setSel(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-mjm-danger/15 py-2 text-sm font-semibold text-mjm-danger"
                onClick={async () => {
                  await softDeleteTransaction(sel.id);
                  setRows((prev) => prev.filter((x) => x.id !== sel.id));
                  setSel(null);
                }}
              >
                Xóa (mềm)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
