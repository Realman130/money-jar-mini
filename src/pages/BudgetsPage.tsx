import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { MetricCard, Pill, ProgressBar, SectionHeader, Surface } from "@/components/common/Fintech";
import { formatVnd } from "@/lib/money";
import { useApp } from "@/context/AppContext";
import { currentMonthStart, getExpenseByJar, getJars, getMonthlyIncomePlan, saveMonthlyIncomePlan } from "@/services/report.service";

export function BudgetsPage() {
  const { telegramUserId, ready, error } = useApp();
  const [month] = useState(() => currentMonthStart());
  const [income, setIncome] = useState("");
  const [loading, setLoading] = useState(true);
  const [jars, setJars] = useState<{ code: string; name_vi: string; target_percent: number }[]>([]);
  const [spent, setSpent] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!ready || !telegramUserId) {
      setLoading(false);
      return;
    }
    Promise.all([getJars(), getMonthlyIncomePlan(telegramUserId, month), getExpenseByJar(telegramUserId, month)])
      .then(([j, plan, byJ]) => {
        setJars((j as { code: string; name_vi: string; target_percent: number }[]).map((x) => ({ ...x, target_percent: Number(x.target_percent) })));
        if (plan) {
          setIncome(String(plan.expected_income));
        }
        const map: Record<string, number> = {};
        for (const row of byJ as { jar_code: string; actual_amount: number }[]) {
          map[row.jar_code] = Number(row.actual_amount);
        }
        setSpent(map);
      })
      .finally(() => setLoading(false));
  }, [ready, telegramUserId, month]);

  const saveIncome = async () => {
    if (!telegramUserId) {
      return;
    }
    const n = Number.parseInt(income.replace(/\D/g, ""), 10) || 0;
    await saveMonthlyIncomePlan(telegramUserId, month, n);
  };

  const planned = Number.parseInt(income.replace(/\D/g, ""), 10) || 0;
  const totalSpent = Object.values(spent).reduce((sum, value) => sum + value, 0);
  const totalBudget = planned > 0 ? planned : 0;
  const globalUsage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const remaining = useMemo(() => Math.max(0, totalBudget - totalSpent), [totalBudget, totalSpent]);

  if (!ready || error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }
  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Ngân sách & 6 hũ" subtitle={month} kicker="Budgeting" />

      <Surface className="space-y-4">
        <SectionHeader title="Kế hoạch tháng" subtitle="Đặt thu nhập dự kiến rồi xem 6 hũ tự chia theo tỷ lệ." />
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Thu dự kiến" value={planned > 0 ? <MoneyText amount={planned} /> : "—"} tone="accent" className="p-3" />
          <MetricCard label="Đã chi" value={<MoneyText amount={totalSpent} type="expense" />} tone="expense" className="p-3" />
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3 text-xs text-mjm-muted">
            <span>Sức khoẻ ngân sách</span>
            <span>
              Còn lại <span className="font-semibold text-mjm-text">{formatVnd(remaining)}</span>
            </span>
          </div>
          <ProgressBar value={globalUsage} tone={globalUsage >= 100 ? "expense" : globalUsage >= 80 ? "warn" : "income"} className="mt-3 h-3" />
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Thu nhập dự kiến tháng</span>
            <input
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="20000000"
              inputMode="numeric"
            />
          </label>
          <button
            type="button"
            onClick={saveIncome}
            className="self-end rounded-[18px] bg-mjm-accent px-5 py-3.5 font-semibold text-white shadow-[0_18px_40px_rgba(91,140,255,0.28)]"
          >
            Lưu kế hoạch
          </button>
        </div>
      </Surface>

      <Surface className="space-y-3">
        <SectionHeader title="6 hũ" subtitle="Từng hũ đang dùng bao nhiêu so với quỹ được chia." />
        <div className="space-y-3">
          {jars.map((j) => {
            const s = spent[j.code] ?? 0;
            const budget = planned > 0 ? Math.round((planned * j.target_percent) / 100) : 0;
            const pct = budget > 0 ? (s / budget) * 100 : 0;
            const tone = pct >= 100 ? "expense" : pct >= 80 ? "warn" : "accent";
            return (
              <div key={j.code} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-mjm-text">{j.name_vi}</p>
                    <p className="mt-1 text-xs text-mjm-muted">
                      {j.target_percent}% quỹ · Đã chi {formatVnd(s)}
                      {budget > 0 ? ` / ${formatVnd(budget)}` : ""}
                    </p>
                  </div>
                  <Pill tone={tone}>{Math.round(Math.min(100, pct))}%</Pill>
                </div>
                <ProgressBar value={pct} tone={tone} className="mt-3" />
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}
