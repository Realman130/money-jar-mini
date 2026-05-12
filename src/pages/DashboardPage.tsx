import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MoneyText } from "@/components/common/MoneyText";
import { formatVnd } from "@/lib/money";
import { useApp } from "@/context/AppContext";
import {
  currentMonthStart,
  getExpenseByCategory,
  getExpenseByJar,
  getJars,
  getMonthlyIncomePlan,
  getMonthlySummary
} from "@/services/report.service";
import { fetchWalletBalances } from "@/services/wallet.service";

export function DashboardPage() {
  const { telegramUserId, ready, error } = useApp();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [month] = useState(() => currentMonthStart());
  const [summary, setSummary] = useState<{
    total_income: number;
    total_expense: number;
    net_amount: number;
    saving_rate_percent: number | null;
  } | null>(null);
  const [balances, setBalances] = useState<{ name_vi: string; current_balance: number; code: string }[]>([]);
  const [topCat, setTopCat] = useState<{ category_name: string; parent_name: string; total_amount: number }[]>([]);
  const [byJar, setByJar] = useState<{ jar_code: string; jar_name_vi: string; actual_amount: number; target_percent: number | null }[]>([]);
  const [incomePlan, setIncomePlan] = useState<number>(0);
  const [jarsMeta, setJarsMeta] = useState<{ code: string; name_vi: string; target_percent: number }[]>([]);

  useEffect(() => {
    if (!ready || !telegramUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [sum, bal, cat, jar, plan, jars] = await Promise.all([
          getMonthlySummary(telegramUserId, month),
          fetchWalletBalances(telegramUserId),
          getExpenseByCategory(telegramUserId, month),
          getExpenseByJar(telegramUserId, month),
          getMonthlyIncomePlan(telegramUserId, month),
          getJars()
        ]);
        if (cancelled) {
          return;
        }
        setSummary(
          sum
            ? {
                total_income: Number(sum.total_income),
                total_expense: Number(sum.total_expense),
                net_amount: Number(sum.net_amount),
                saving_rate_percent: sum.saving_rate_percent != null ? Number(sum.saving_rate_percent) : null
              }
            : { total_income: 0, total_expense: 0, net_amount: 0, saving_rate_percent: null }
        );
        setBalances(
          (bal as { name_vi: string; current_balance: number; code: string }[]).map((b) => ({
            name_vi: b.name_vi,
            current_balance: Number(b.current_balance),
            code: b.code
          }))
        );
        setTopCat(
          (cat as { category_name: string; parent_name: string; total_amount: number }[])
            .slice(0, 5)
            .map((c) => ({
              ...c,
              total_amount: Number(c.total_amount)
            }))
        );
        setByJar(
          (jar as { jar_code: string; jar_name_vi: string; actual_amount: number; target_percent: number | null }[]).map(
            (j) => ({
              ...j,
              actual_amount: Number(j.actual_amount),
              target_percent: j.target_percent != null ? Number(j.target_percent) : null
            })
          )
        );
        setIncomePlan(plan ? Number(plan.expected_income) : 0);
        setJarsMeta(
          (jars as { code: string; name_vi: string; target_percent: number }[]).map((j) => ({
            code: j.code,
            name_vi: j.name_vi,
            target_percent: Number(j.target_percent)
          }))
        );
        setErr(null);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, telegramUserId, month]);

  if (!ready) {
    return <Loading />;
  }
  if (error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? "Thiếu Telegram user"} />;
  }
  if (loading) {
    return <Loading />;
  }
  if (err) {
    return <EmptyState title="Lỗi tải dữ liệu" hint={err} />;
  }

  const thu = summary?.total_income ?? 0;
  const chi = summary?.total_expense ?? 0;
  const conLai = summary?.net_amount ?? thu - chi;
  const rate = summary?.saving_rate_percent;
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const dayNum = Number(today.slice(8, 10));
  const avg = dayNum > 0 ? Math.round(chi / dayNum) : 0;
  const daysLeft = Math.max(0, daysInMonth - dayNum);
  const projected = dayNum > 0 ? Math.round((chi / dayNum) * daysInMonth) : 0;
  const plannedIncome = incomePlan > 0 ? incomePlan : thu;

  return (
    <div className="space-y-6">
      <PageHeader title="Money Jar Mini" subtitle={`Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`} />

      <section className="rounded-2xl border border-mjm-border bg-mjm-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-mjm-muted">Tổng quan tháng</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-mjm-muted">Tổng thu</p>
            <MoneyText amount={thu} type="income" />
          </div>
          <div>
            <p className="text-mjm-muted">Tổng chi</p>
            <MoneyText amount={chi} type="expense" />
          </div>
          <div>
            <p className="text-mjm-muted">Còn lại</p>
            <MoneyText amount={conLai} type={conLai >= 0 ? "income" : "expense"} />
          </div>
          <div>
            <p className="text-mjm-muted">Tỷ lệ giữ lại</p>
            <p className="font-semibold text-mjm-text">{rate != null ? `${rate.toFixed(2)}%` : "—"}</p>
          </div>
          <div>
            <p className="text-mjm-muted">TB chi / ngày</p>
            <p className="font-semibold tabular-nums text-mjm-text">{formatVnd(avg)}</p>
          </div>
          <div>
            <p className="text-mjm-muted">Ngày còn lại</p>
            <p className="font-semibold text-mjm-text">{daysLeft}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-mjm-muted">
          Dự kiến chi cả tháng (theo tốc độ hiện tại): <span className="font-medium text-mjm-text">{formatVnd(projected)}</span>
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Link
          to="/quick?mode=chi"
          className="rounded-xl bg-mjm-expense/10 px-3 py-3 text-center text-sm font-semibold text-mjm-expense"
        >
          ＋ Chi
        </Link>
        <Link
          to="/quick?mode=thu"
          className="rounded-xl bg-mjm-income/10 px-3 py-3 text-center text-sm font-semibold text-mjm-income"
        >
          ＋ Thu
        </Link>
        <Link to="/quick?tab=transfer" className="col-span-2 rounded-xl border border-mjm-border bg-mjm-surface py-3 text-center text-sm font-semibold">
          Chuyển ví
        </Link>
        <Link to="/quick" className="col-span-2 rounded-xl bg-mjm-accent py-3 text-center text-sm font-semibold text-white">
          Nhập nhanh
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-mjm-muted">Ví</h2>
        <div className="space-y-2">
          {balances.map((b) => (
            <div
              key={b.code}
              className="flex items-center justify-between rounded-xl border border-mjm-border bg-mjm-surface px-3 py-2.5"
            >
              <span className="text-sm font-medium">{b.name_vi}</span>
              <MoneyText amount={b.current_balance} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-mjm-muted">Top chi tiêu</h2>
        <div className="space-y-2">
          {topCat.length === 0 ? (
            <EmptyState title="Chưa có chi tiêu" />
          ) : (
            topCat.map((c) => (
              <div key={c.category_name} className="flex justify-between rounded-xl border border-mjm-border bg-mjm-surface px-3 py-2">
                <span className="text-sm">
                  {c.parent_name} · {c.category_name}
                </span>
                <MoneyText amount={c.total_amount} type="expense" />
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-mjm-muted">6 hũ</h2>
        <div className="space-y-3">
          {jarsMeta.map((j) => {
            const row = byJar.find((x) => x.jar_code === j.code);
            const spent = row?.actual_amount ?? 0;
            const pct = j.target_percent;
            const budget = plannedIncome > 0 && pct != null ? Math.round((plannedIncome * pct) / 100) : 0;
            const usedPct = budget > 0 ? Math.round((spent / budget) * 100) : spent > 0 ? 100 : 0;
            const warn = usedPct >= 100 ? "danger" : usedPct >= 80 ? "warn" : "ok";
            return (
              <div key={j.code} className="rounded-xl border border-mjm-border bg-mjm-surface p-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>{j.name_vi}</span>
                  <span className={warn === "danger" ? "text-mjm-danger" : warn === "warn" ? "text-mjm-warn" : "text-mjm-muted"}>
                    {usedPct}% dùng
                  </span>
                </div>
                <p className="mt-1 text-xs text-mjm-muted">
                  Đã chi {formatVnd(spent)}
                  {budget > 0 ? ` / kế hoạch ${formatVnd(budget)}` : ""}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-mjm-border">
                  <div
                    className={`h-full rounded-full ${warn === "danger" ? "bg-mjm-danger" : warn === "warn" ? "bg-mjm-warn" : "bg-mjm-accent"}`}
                    style={{ width: `${Math.min(100, usedPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
