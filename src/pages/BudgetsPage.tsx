import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
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

  if (!ready || error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }
  if (loading) {
    return <Loading />;
  }

  const planned = Number.parseInt(income.replace(/\D/g, ""), 10) || 0;

  return (
    <div>
      <PageHeader title="Ngân sách & 6 hũ" subtitle={month} />
      <div className="mb-4 rounded-2xl border border-mjm-border bg-mjm-surface p-4">
        <label className="text-xs font-medium text-mjm-muted">Thu nhập dự kiến tháng</label>
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-mjm-border bg-mjm-bg px-3 py-2 text-mjm-text"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="20000000"
            inputMode="numeric"
          />
          <button type="button" onClick={saveIncome} className="rounded-xl bg-mjm-accent px-4 py-2 text-sm font-semibold text-white">
            Lưu
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {jars.map((j) => {
          const s = spent[j.code] ?? 0;
          const budget = planned > 0 ? Math.round((planned * j.target_percent) / 100) : 0;
          const pct = budget > 0 ? Math.round((s / budget) * 100) : 0;
          return (
            <div key={j.code} className="rounded-2xl border border-mjm-border bg-mjm-surface p-4">
              <div className="flex justify-between text-sm font-semibold">
                <span>{j.name_vi}</span>
                <span className="text-mjm-muted">{j.target_percent}% kế hoạch</span>
              </div>
              <p className="mt-1 text-xs text-mjm-muted">
                Đã chi {formatVnd(s)}
                {budget > 0 ? ` / ${formatVnd(budget)}` : ""}
              </p>
              <p className="mt-1 text-xs">Dùng ~{pct}% ngân sách hũ</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
