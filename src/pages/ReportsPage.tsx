import { useEffect, useMemo, useState } from "react";
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
  getExpenseCategoryMixByJar,
  getExpenseByCategory,
  getExpenseByJar,
  getJars,
  getMonthlyIncomePlan,
  getMonthlySummary
} from "@/services/report.service";
import { fetchWalletBalances } from "@/services/wallet.service";
import { formatVnd } from "@/lib/money";
import { formatPercent } from "@/lib/crypto";

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
const RADIAN = Math.PI / 180;

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

function JarPieCalloutLabel(
  props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    outerRadius?: number;
    percent?: number;
    index?: number;
    payload?: { category_name?: string };
  },
  highlightedIndexes: Set<number>
) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, index = -1, payload } = props;
  if (!highlightedIndexes.has(index) || percent < 0.04) {
    return null;
  }

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const startX = cx + (outerRadius + 6) * cos;
  const startY = cy + (outerRadius + 6) * sin;
  const midX = cx + (outerRadius + 18) * cos;
  const midY = cy + (outerRadius + 18) * sin;
  const endX = midX + (cos >= 0 ? 18 : -18);
  const endY = midY;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <path d={`M${startX},${startY} L${midX},${midY} L${endX},${endY}`} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} fill="none" />
      <circle cx={endX} cy={endY} r={2.5} fill="#f4f7fb" />
      <text x={endX + (cos >= 0 ? 6 : -6)} y={endY - 4} textAnchor={textAnchor} fill="#f4f7fb" fontSize="11" fontWeight="700">
        {payload?.category_name}
      </text>
      <text x={endX + (cos >= 0 ? 6 : -6)} y={endY + 11} textAnchor={textAnchor} fill="#94a3b8" fontSize="10">
        {formatPercent(percent * 100, { maximumFractionDigits: 1 })}
      </text>
    </g>
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
  const [jarsMeta, setJarsMeta] = useState<{ code: string; name_vi: string; target_percent: number }[]>([]);
  const [jarMixRows, setJarMixRows] = useState<
    {
      jar_code: string;
      jar_name_vi: string;
      category_name: string;
      category_parent_name: string;
      category_color: string;
      amount: number;
    }[]
  >([]);
  const [wbal, setWbal] = useState<{ name_vi: string; current_balance: number; code?: string; kind?: string }[]>([]);
  const [incomePlan, setIncomePlan] = useState<number>(0);
  const [selectedJarCode, setSelectedJarCode] = useState<string | null>(null);

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
      getExpenseCategoryMixByJar(telegramUserId, month, end),
      getJars(),
      fetchWalletBalances(telegramUserId),
      getMonthlyIncomePlan(telegramUserId, month)
    ])
      .then(([s, d, c, j, mix, jars, w, p]) => {
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
        setJarMixRows(
          (
            mix as {
              jar_code: string;
              jar_name_vi: string;
              category_name: string;
              category_parent_name: string;
              category_color: string;
              amount: number;
            }[]
          ).map((x) => ({
            ...x,
            amount: Number(x.amount)
          }))
        );
        setJarsMeta(
          (jars as { code: string; name_vi: string; target_percent: number }[]).map((x) => ({
            ...x,
            target_percent: Number(x.target_percent)
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

  useEffect(() => {
    if (selectedJarCode || jarsMeta.length === 0) {
      return;
    }
    setSelectedJarCode(jarsMeta[0]?.code ?? null);
  }, [jarsMeta, selectedJarCode]);

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
  const jarCards = useMemo(() => {
    const actualMap = new Map(byJar.filter((item) => item.jar_code).map((item) => [item.jar_code as string, item]));
    return jarsMeta.map((jar) => {
      const current = actualMap.get(jar.code);
      return {
        jar_code: jar.code,
        jar_name_vi: jar.name_vi,
        target_percent: jar.target_percent,
        actual_amount: current?.actual_amount ?? 0
      };
    });
  }, [byJar, jarsMeta]);
  const uncategorizedExpense = useMemo(
    () => byJar.filter((item) => !item.jar_code).reduce((sum, item) => sum + item.actual_amount, 0),
    [byJar]
  );
  const jarBreakdown = useMemo(() => {
    const filtered = jarMixRows.filter((row) => row.jar_code === selectedJarCode);
    const grouped = new Map<
      string,
      {
        category_name: string;
        category_parent_name: string;
        category_color: string;
        total_amount: number;
      }
    >();

    for (const row of filtered) {
      const key = `${row.category_parent_name}__${row.category_name}`;
      const current = grouped.get(key);
      if (current) {
        current.total_amount += row.amount;
        continue;
      }
      grouped.set(key, {
        category_name: row.category_name,
        category_parent_name: row.category_parent_name,
        category_color: row.category_color,
        total_amount: row.amount
      });
    }

    return [...grouped.values()].sort((a, b) => b.total_amount - a.total_amount);
  }, [jarMixRows, selectedJarCode]);
  const selectedJar = useMemo(
    () => jarCards.find((jar) => jar.jar_code === selectedJarCode) ?? null,
    [jarCards, selectedJarCode]
  );
  const highlightedJarIndexes = useMemo(
    () => new Set(jarBreakdown.map((_, index) => index).filter((index) => index < 3)),
    [jarBreakdown]
  );

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
  const selectedJarBudget = selectedJar ? Math.round((plannedIncome * (selectedJar.target_percent ?? 0)) / 100) : 0;
  const selectedJarShareOfIncome = plannedIncome > 0 && selectedJar ? (selectedJar.actual_amount / plannedIncome) * 100 : 0;

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
        <div className="space-y-4">
          <Surface className="space-y-3">
            <SectionHeader title="6 hũ" subtitle="Chạm vào từng hũ để xem tỷ trọng danh mục và phần trăm trên thu nhập." />
            {uncategorizedExpense > 0 ? (
              <div className="rounded-[18px] border border-mjm-warn/25 bg-mjm-warn/10 px-4 py-3 text-sm leading-6 text-mjm-text">
                Còn {formatVnd(uncategorizedExpense)} chưa gán vào hũ nào. Những khoản này sẽ không vào breakdown 6 hũ cho tới khi được phân loại.
              </div>
            ) : null}
            <div className="space-y-3">
              {jarCards.map((j) => {
                const percent = j.target_percent ?? 10;
                const budget = plannedIncome > 0 ? Math.round((plannedIncome * percent) / 100) : 0;
                const usedPct = budget > 0 ? (j.actual_amount / budget) * 100 : j.actual_amount > 0 ? 100 : 0;
                const tone = usedPct >= 100 ? "expense" : usedPct >= 80 ? "warn" : "accent";
                const isActive = selectedJarCode === j.jar_code;
                return (
                  <button
                    key={j.jar_code}
                    type="button"
                    onClick={() => setSelectedJarCode(j.jar_code)}
                    className={`w-full rounded-[20px] border p-3 text-left transition ${
                      isActive
                        ? "border-mjm-accent/30 bg-mjm-accent/10 shadow-[0_0_0_1px_rgba(91,140,255,0.16)]"
                        : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]"
                    }`}
                  >
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
                  </button>
                );
              })}
            </div>
          </Surface>

          {selectedJar ? (
            <Surface className="space-y-4">
              <SectionHeader
                title={`Chi tiết hũ ${selectedJar.jar_name_vi}`}
                subtitle="Pie chart cho biết tỷ trọng trong hũ. Danh sách bên dưới cho biết từng danh mục đang chiếm bao nhiêu phần trăm thu nhập tháng."
                action={<Pill tone="accent">{formatPercent(selectedJarShareOfIncome, { maximumFractionDigits: 1 })}</Pill>}
              />

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Đã chi</p>
                  <div className="mt-2 text-[0.88rem] font-semibold tracking-[-0.04em] text-mjm-expense">{formatVnd(selectedJar.actual_amount)}</div>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Kế hoạch</p>
                  <div className="mt-2 text-[0.88rem] font-semibold tracking-[-0.04em] text-mjm-accent">{selectedJarBudget > 0 ? formatVnd(selectedJarBudget) : "—"}</div>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">% thu nhập</p>
                  <div className="mt-2 text-[0.88rem] font-semibold tracking-[-0.04em] text-mjm-text">
                    {plannedIncome > 0 ? formatPercent(selectedJarShareOfIncome, { maximumFractionDigits: 1 }) : "—"}
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Mục chi</p>
                  <div className="mt-2 text-[0.88rem] font-semibold tracking-[-0.04em] text-mjm-text">{jarBreakdown.length}</div>
                </div>
              </div>

              {jarBreakdown.length === 0 ? (
                <EmptyState title="Chưa có chi tiêu trong hũ này" hint="Khi phát sinh giao dịch thuộc hũ này, breakdown sẽ hiện ra tại đây." />
              ) : (
                <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="h-72 overflow-hidden rounded-[22px] border border-white/10 bg-black/10 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={jarBreakdown}
                          dataKey="total_amount"
                          nameKey="category_name"
                          innerRadius={54}
                          outerRadius={92}
                          paddingAngle={2}
                          labelLine={false}
                          label={(props) => JarPieCalloutLabel(props, highlightedJarIndexes)}
                        >
                          {jarBreakdown.map((entry, index) => (
                            <Cell key={`${entry.category_name}-${index}`} fill={entry.category_color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CategoryTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {jarBreakdown.map((item) => {
                      const shareOfJar = selectedJar.actual_amount > 0 ? (item.total_amount / selectedJar.actual_amount) * 100 : 0;
                      const shareOfIncome = plannedIncome > 0 ? (item.total_amount / plannedIncome) * 100 : 0;
                      return (
                        <div key={`${selectedJar.jar_code}-${item.category_name}`} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: item.category_color || COLORS[0] }}
                                />
                                <p className="truncate font-semibold text-mjm-text">{item.category_name}</p>
                              </div>
                              <p className="mt-1 text-xs text-mjm-muted">{item.category_parent_name}</p>
                            </div>
                            <MoneyText amount={item.total_amount} type="expense" />
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-mjm-muted">
                            <span>{formatPercent(shareOfJar, { maximumFractionDigits: 1 })} trong hũ</span>
                            <span>{plannedIncome > 0 ? formatPercent(shareOfIncome, { maximumFractionDigits: 1 }) : "—"} thu nhập</span>
                          </div>
                          <ProgressBar value={shareOfJar} tone="expense" className="mt-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Surface>
          ) : null}
        </div>
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
