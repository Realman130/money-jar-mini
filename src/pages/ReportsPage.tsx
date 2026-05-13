import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { Pill, ProgressBar, SectionHeader, Surface } from "@/components/common/Fintech";
import { useApp } from "@/context/AppContext";
import { monthEndDate } from "@/lib/date";
import {
  currentMonthStart,
  getDailyFlow,
  getExpenseByCategory,
  getExpenseByJar,
  getMonthlyIncomePlan,
  getMonthlySummary
} from "@/services/report.service";
import { fetchWalletBalances } from "@/services/wallet.service";
import { formatVnd } from "@/lib/money";

const chartTooltipStyle = {
  backgroundColor: "#0c131f",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  color: "#f4f7fb",
  boxShadow: "0 24px 60px rgba(2,6,23,0.45)"
};

const chartLabelStyle = {
  fill: "#94a3b8",
  fontSize: 11
};

const COLORS = ["#5b8cff", "#4ade80", "#ff7462", "#fbbf24", "#8b5cf6", "#ec4899", "#14b8a6"];

function CategoryTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{
    value?: number | string;
    fill?: string;
    color?: string;
    payload?: { category_name?: string; total_amount?: number };
  }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const categoryName = item.payload?.category_name ?? "Danh mục";
  const amount = Number(item.value ?? item.payload?.total_amount ?? 0);
  const dotColor = item.fill ?? item.color ?? "#5b8cff";

  return (
    <div className="rounded-[18px] border border-white/10 bg-[#0b111b]/95 px-3 py-2 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <p className="text-sm font-semibold text-mjm-text">{categoryName}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="text-sm font-semibold tabular-nums text-mjm-text">{formatVnd(amount)}</span>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { telegramUserId, ready, error } = useApp();
  const [tab, setTab] = useState<"overview" | "category" | "jars" | "wallets">("overview");
  const [loading, setLoading] = useState(true);
  const [month] = useState(() => currentMonthStart());
  const [summary, setSummary] = useState<{ total_income: number; total_expense: number; net_amount: number } | null>(null);
  const [daily, setDaily] = useState<{ transaction_date: string; total_expense: number; total_income: number }[]>([]);
  const [byCat, setByCat] = useState<{ category_name: string; total_amount: number }[]>([]);
  const [byJar, setByJar] = useState<{ jar_name_vi: string; actual_amount: number; jar_code?: string; target_percent: number | null }[]>([]);
  const [wbal, setWbal] = useState<{ name_vi: string; current_balance: number; code?: string; kind?: string }[]>([]);
  const [incomePlan, setIncomePlan] = useState<number>(0);

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
      fetchWalletBalances(telegramUserId),
      getMonthlyIncomePlan(telegramUserId, month)
    ])
      .then(([s, d, c, j, w, p]) => {
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
          (j as { jar_name_vi: string; actual_amount: number; jar_code?: string; target_percent: number | null }[]).map((x) => ({
            ...x,
            actual_amount: Number(x.actual_amount),
            target_percent: x.target_percent != null ? Number(x.target_percent) : null
          }))
        );
        setWbal(
          (w as { name_vi: string; current_balance: number; code?: string; kind?: string }[]).map((x) => ({
            ...x,
            current_balance: Number(x.current_balance)
          }))
        );
        setIncomePlan(p ? Number(p.expected_income) : 0);
      })
      .finally(() => setLoading(false));
  }, [ready, telegramUserId, month]);

  const dailyChart = useMemo(
    () =>
      daily
        .map((d) => ({
          day: d.transaction_date.slice(8),
          total_expense: d.total_expense,
          total_income: d.total_income
        }))
        .sort((a, b) => Number(a.day) - Number(b.day)),
    [daily]
  );

  const cumulative = useMemo(() => {
    let running = 0;
    return dailyChart.map((d) => {
      running += d.total_expense;
      return { day: d.day, value: running };
    });
  }, [dailyChart]);

  const sortedCats = useMemo(() => byCat.slice().sort((a, b) => b.total_amount - a.total_amount), [byCat]);

  const totalExpense = summary?.total_expense ?? 0;
  const totalIncome = summary?.total_income ?? 0;
  const net = summary?.net_amount ?? 0;
  const plannedIncome = incomePlan > 0 ? incomePlan : totalIncome;
  const burnRate = plannedIncome > 0 ? Math.min(100, (totalExpense / plannedIncome) * 100) : 0;
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const dayNum = Number(today.slice(8, 10));
  const avgExpense = dayNum > 0 ? Math.round(totalExpense / dayNum) : 0;
  const projected = dayNum > 0 ? Math.round((totalExpense / dayNum) * daysInMonth) : 0;

  const tabs = [
    { id: "overview" as const, label: "Tổng quan" },
    { id: "category" as const, label: "Danh mục" },
    { id: "jars" as const, label: "6 hũ" },
    { id: "wallets" as const, label: "Ví" }
  ];

  if (!ready || error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }
  if (loading) {
    return <Loading />;
  }

  const peakDay = dailyChart.reduce<{ day: string; expense: number } | null>((best, item) => {
    if (!best || item.total_expense > best.expense) {
      return { day: item.day, expense: item.total_expense };
    }
    return best;
  }, null);

  return (
    <div className="space-y-5">
      <PageHeader title="Báo cáo" subtitle={month} kicker="Analytics" />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "border-mjm-accent/30 bg-mjm-accent/16 text-white"
                : "border-white/10 bg-white/[0.03] text-mjm-muted hover:border-white/15 hover:bg-white/[0.05]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && summary ? (
        <div className="space-y-4">
          <Surface className="space-y-4">
            <SectionHeader title="Tình hình tháng" subtitle="Cân bằng thu chi và mức tiêu hao so với quỹ dự kiến." />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Thu</p>
                <div className="mt-2 whitespace-nowrap text-[0.82rem] font-semibold tabular-nums tracking-[-0.04em] text-mjm-income sm:text-[0.9rem]">
                  {formatVnd(totalIncome)}
                </div>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Chi</p>
                <div className="mt-2 whitespace-nowrap text-[0.82rem] font-semibold tabular-nums tracking-[-0.04em] text-mjm-expense sm:text-[0.9rem]">
                  {formatVnd(totalExpense)}
                </div>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Dư</p>
                <div className={`mt-2 whitespace-nowrap text-[0.82rem] font-semibold tabular-nums tracking-[-0.04em] ${net >= 0 ? "text-mjm-income" : "text-mjm-expense"} sm:text-[0.9rem]`}>
                  {net >= 0 ? "+" : "-"}
                  {formatVnd(Math.abs(net))}
                </div>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Kế hoạch</p>
                <div className="mt-2 whitespace-nowrap text-[0.82rem] font-semibold tracking-[-0.04em] text-mjm-accent sm:text-[0.9rem]">
                  {plannedIncome > 0 ? formatVnd(plannedIncome) : "—"}
                </div>
                <p className="mt-1 text-xs text-mjm-muted">Thu nhập dự kiến</p>
              </div>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 text-xs text-mjm-muted">
                <span>Tốc độ chi</span>
                <span>
                  {formatVnd(avgExpense)} / ngày · Dự kiến {formatVnd(projected)}
                </span>
              </div>
              <ProgressBar value={burnRate} tone={projected > plannedIncome ? "expense" : projected > plannedIncome * 0.9 ? "warn" : "income"} className="mt-3 h-3" />
            </div>
          </Surface>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Surface className="space-y-3">
              <SectionHeader title="Chi và thu theo ngày" subtitle="Tháng này hiển thị theo từng ngày để thấy nhịp tiền." />
              <div className="h-72 overflow-hidden rounded-[22px] border border-white/10 bg-black/10 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChart}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={chartLabelStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={chartLabelStyle} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatVnd(value), name === "total_income" ? "Thu" : "Chi"]}
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: "#f4f7fb" }}
                      cursor={{ fill: "rgba(91,140,255,0.08)" }}
                    />
                    <Bar dataKey="total_income" fill="#4ade80" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="total_expense" fill="#ff7462" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Surface>

            <Surface className="space-y-3">
              <SectionHeader title="Chi lũy kế" subtitle="Theo dõi tốc độ cộng dồn để nhìn ra những cú bứt chi." />
              <div className="h-72 overflow-hidden rounded-[22px] border border-white/10 bg-black/10 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulative}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={chartLabelStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={chartLabelStyle} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      formatter={(value: number) => formatVnd(value)}
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: "#f4f7fb" }}
                      cursor={{ stroke: "rgba(91,140,255,0.18)" }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#5b8cff" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Điểm nhấn</p>
                <p className="mt-2 text-sm leading-6 text-mjm-text">
                  {peakDay
                    ? `Ngày ${peakDay.day} là ngày chi mạnh nhất với ${formatVnd(peakDay.expense)}.`
                    : "Chưa có dữ liệu chi tiêu để xác định ngày cao điểm."}
                </p>
              </div>
            </Surface>
          </div>
        </div>
      ) : null}

      {tab === "category" ? (
        <div className="space-y-4">
          <Surface className="space-y-3">
            <SectionHeader title="Chi theo danh mục" subtitle="Bar chart dễ scan hơn pie chart trên mobile." />
            <div className="h-72 overflow-hidden rounded-[22px] border border-white/10 bg-black/10 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedCats} layout="vertical" margin={{ left: 12, right: 20 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis type="number" tick={chartLabelStyle} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category_name" tick={chartLabelStyle} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={<CategoryTooltip />} cursor={{ fill: "rgba(91,140,255,0.08)" }} />
                  <Bar dataKey="total_amount" radius={[0, 12, 12, 0]}>
                    {sortedCats.map((entry, index) => (
                      <Cell key={entry.category_name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Surface>

          <Surface className="space-y-3">
            <SectionHeader title="Xếp hạng" subtitle="10 danh mục chi nhiều nhất trong tháng." />
            <div className="space-y-3">
              {sortedCats.map((item, index) => {
                const share = totalExpense > 0 ? (item.total_amount / totalExpense) * 100 : 0;
                return (
                  <div key={item.category_name} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mjm-muted">#{index + 1}</p>
                        <p className="mt-1 truncate font-semibold text-mjm-text">{item.category_name}</p>
                      </div>
                      <MoneyText amount={item.total_amount} type="expense" />
                    </div>
                    <ProgressBar value={share} tone="expense" className="mt-3" />
                  </div>
                );
              })}
            </div>
          </Surface>
        </div>
      ) : null}

      {tab === "jars" ? (
        <Surface className="space-y-3">
          <SectionHeader title="6 hũ" subtitle="Tỷ lệ thực chi so với quỹ dự kiến theo thu nhập." />
          <div className="space-y-3">
            {byJar.map((j) => {
              const percent = j.target_percent ?? 10;
              const budget = plannedIncome > 0 ? Math.round((plannedIncome * percent) / 100) : 0;
              const usedPct = budget > 0 ? (j.actual_amount / budget) * 100 : j.actual_amount > 0 ? 100 : 0;
              const tone = usedPct >= 100 ? "expense" : usedPct >= 80 ? "warn" : "accent";
              return (
                <div key={j.jar_name_vi} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-mjm-text">{j.jar_name_vi}</p>
                      <p className="mt-1 text-xs text-mjm-muted">
                        Đã chi {formatVnd(j.actual_amount)}
                        {budget > 0 ? ` / kế hoạch ${formatVnd(budget)}` : ""}
                      </p>
                    </div>
                    <Pill tone={tone}>{Math.round(Math.min(100, usedPct))}%</Pill>
                  </div>
                  <ProgressBar value={usedPct} tone={tone} className="mt-3" />
                </div>
              );
            })}
          </div>
        </Surface>
      ) : null}

      {tab === "wallets" ? (
        <Surface className="space-y-3">
          <SectionHeader title="Ví" subtitle="Phân bổ số dư và mức độ ưu tiên hiện tại." />
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Tổng tài sản</p>
            <p className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-mjm-text">
              <MoneyText amount={wbal.reduce((sum, row) => sum + row.current_balance, 0)} />
            </p>
          </div>
          <div className="space-y-3">
            {wbal.map((w) => {
              const total = wbal.reduce((sum, row) => sum + row.current_balance, 0);
              const share = total > 0 ? (w.current_balance / total) * 100 : 0;
              return (
                <div key={w.name_vi} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-mjm-text">{w.name_vi}</p>
                      <p className="mt-1 text-xs text-mjm-muted">{w.kind ?? w.code ?? "Ví"}</p>
                    </div>
                    <MoneyText amount={w.current_balance} />
                  </div>
                  <ProgressBar value={share} tone="accent" className="mt-3" />
                </div>
              );
            })}
          </div>
        </Surface>
      ) : null}
    </div>
  );
}
