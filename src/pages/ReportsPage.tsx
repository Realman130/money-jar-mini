import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { useApp } from "@/context/AppContext";
import { monthEndDate } from "@/lib/date";
import { currentMonthStart, getDailyFlow, getExpenseByCategory, getExpenseByJar, getMonthlySummary } from "@/services/report.service";
import { fetchWalletBalances } from "@/services/wallet.service";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#9333ea", "#ec4899", "#14b8a6"];

export function ReportsPage() {
  const { telegramUserId, ready, error } = useApp();
  const [tab, setTab] = useState<"overview" | "category" | "jars" | "wallets">("overview");
  const [loading, setLoading] = useState(true);
  const [month] = useState(() => currentMonthStart());
  const [summary, setSummary] = useState<{ total_income: number; total_expense: number; net_amount: number } | null>(null);
  const [daily, setDaily] = useState<{ transaction_date: string; total_expense: number; total_income: number }[]>([]);
  const [byCat, setByCat] = useState<{ category_name: string; total_amount: number }[]>([]);
  const [byJar, setByJar] = useState<{ jar_name_vi: string; actual_amount: number }[]>([]);
  const [wbal, setWbal] = useState<{ name_vi: string; current_balance: number }[]>([]);

  useEffect(() => {
    if (!ready || !telegramUserId) {
      setLoading(false);
      return;
    }
    const end = monthEndDate(month);
    Promise.all([
      getMonthlySummary(telegramUserId, month),
      getDailyFlow(telegramUserId, month, end),
      getExpenseByCategory(telegramUserId, month),
      getExpenseByJar(telegramUserId, month),
      fetchWalletBalances(telegramUserId)
    ])
      .then(([s, d, c, j, w]) => {
        setSummary(
          s
            ? {
                total_income: Number(s.total_income),
                total_expense: Number(s.total_expense),
                net_amount: Number(s.net_amount)
              }
            : { total_income: 0, total_expense: 0, net_amount: 0 }
        );
        setDaily(
          (d as { transaction_date: string; total_expense: number; total_income: number }[]).map((x) => ({
            ...x,
            total_expense: Number(x.total_expense),
            total_income: Number(x.total_income)
          }))
        );
        setByCat(
          (c as { category_name: string; total_amount: number }[])
            .slice(0, 10)
            .map((x) => ({ ...x, total_amount: Number(x.total_amount) }))
        );
        setByJar(
          (j as { jar_name_vi: string; actual_amount: number }[]).map((x) => ({
            ...x,
            actual_amount: Number(x.actual_amount)
          }))
        );
        setWbal(
          (w as { name_vi: string; current_balance: number }[]).map((x) => ({
            name_vi: x.name_vi,
            current_balance: Number(x.current_balance)
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [ready, telegramUserId, month]);

  if (!ready || error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }
  if (loading) {
    return <Loading />;
  }

  const tabs = [
    { id: "overview" as const, label: "Tổng quan" },
    { id: "category" as const, label: "Danh mục" },
    { id: "jars" as const, label: "6 hũ" },
    { id: "wallets" as const, label: "Ví" }
  ];

  let cum = 0;
  const cumLine = daily
    .slice()
    .sort((a, b) => (a.transaction_date < b.transaction_date ? -1 : 1))
    .map((d) => {
      cum += d.total_expense;
      return { day: d.transaction_date.slice(8), cum };
    });

  return (
    <div>
      <PageHeader title="Báo cáo" subtitle={month} />
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === t.id ? "bg-mjm-accent text-white" : "bg-mjm-surface text-mjm-muted border border-mjm-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-mjm-border bg-mjm-surface p-3 text-sm">
            <div>
              <p className="text-mjm-muted">Thu</p>
              <MoneyText amount={summary.total_income} type="income" />
            </div>
            <div>
              <p className="text-mjm-muted">Chi</p>
              <MoneyText amount={summary.total_expense} type="expense" />
            </div>
          </div>
          <div className="h-56 rounded-2xl border border-mjm-border bg-mjm-surface p-2">
            <p className="px-2 pt-2 text-xs font-medium text-mjm-muted">Chi theo ngày</p>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={daily.map((d) => ({ ...d, day: d.transaction_date.slice(8) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415540" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v: number) => v.toLocaleString("vi-VN")} />
                <Bar dataKey="total_expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-56 rounded-2xl border border-mjm-border bg-mjm-surface p-2">
            <p className="px-2 pt-2 text-xs font-medium text-mjm-muted">Chi lũy kế</p>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={cumLine}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415540" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v: number) => v.toLocaleString("vi-VN")} />
                <Line type="monotone" dataKey="cum" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {tab === "category" ? (
        <div className="h-72 rounded-2xl border border-mjm-border bg-mjm-surface p-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byCat} dataKey="total_amount" nameKey="category_name" cx="50%" cy="50%" outerRadius={80}>
                {byCat.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString("vi-VN")} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {tab === "jars" ? (
        <div className="space-y-2">
          {byJar.map((j) => (
            <div key={j.jar_name_vi} className="flex justify-between rounded-xl border border-mjm-border bg-mjm-surface px-3 py-2">
              <span className="text-sm">{j.jar_name_vi}</span>
              <MoneyText amount={j.actual_amount} type="expense" />
            </div>
          ))}
        </div>
      ) : null}

      {tab === "wallets" ? (
        <div className="space-y-2">
          {wbal.map((w) => (
            <div key={w.name_vi} className="flex justify-between rounded-xl border border-mjm-border bg-mjm-surface px-3 py-2">
              <span className="text-sm">{w.name_vi}</span>
              <MoneyText amount={w.current_balance} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
