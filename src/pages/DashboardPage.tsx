import { useEffect, useMemo, useState } from "react";
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
import { Pill, ProgressBar, SectionHeader, Surface } from "@/components/common/Fintech";

export function DashboardPage() {
  const { telegramUserId, ready, error, categories } = useApp();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [month] = useState(() => currentMonthStart());
  const [summary, setSummary] = useState<{
    total_income: number;
    total_expense: number;
    net_amount: number;
    saving_rate_percent: number | null;
  } | null>(null);
  const [balances, setBalances] = useState<{ name_vi: string; current_balance: number; code: string; kind?: string }[]>([]);
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
          (bal as { name_vi: string; current_balance: number; code: string; kind?: string }[]).map((b) => ({
            name_vi: b.name_vi,
            current_balance: Number(b.current_balance),
            code: b.code,
            kind: b.kind
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
          (jar as { jar_code: string; jar_name_vi: string; actual_amount: number; target_percent: number | null }[]).map((j) => ({
            ...j,
            actual_amount: Number(j.actual_amount),
            target_percent: j.target_percent != null ? Number(j.target_percent) : null
          }))
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

  const categoryMap = useMemo(() => {
    const map = new Map<string, { icon: string; color: string }>();
    for (const category of categories) {
      map.set(category.name, { icon: category.icon, color: category.color });
    }
    return map;
  }, [categories]);

  const totalAssets = balances.reduce((sum, row) => sum + row.current_balance, 0);

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
  const burnRatio = plannedIncome > 0 ? Math.min(100, (chi / plannedIncome) * 100) : 0;
  const heroTone = projected > plannedIncome ? "expense" : projected > plannedIncome * 0.9 ? "warn" : "income";
  const heroToneClass =
    heroTone === "income" ? "text-mjm-income" : heroTone === "expense" ? "text-mjm-expense" : "text-mjm-warn";
  const heroCopy =
    projected > plannedIncome
      ? "Chi tiêu đang vượt quỹ dự kiến. Nên giữ nhịp trong các ngày còn lại."
      : projected > plannedIncome * 0.9
        ? "Nhịp chi tiêu đang khá sát kế hoạch. Có thể theo dõi thêm một chút."
        : "Nhịp chi tiêu đang ổn. Bạn đang giữ được vùng an toàn cho tháng này.";
  const insightBadge = projected > plannedIncome ? "Cần chú ý" : projected > plannedIncome * 0.9 ? "Sát kế hoạch" : "Đang an toàn";

  return (
    <div className="space-y-5">
      <PageHeader title="Money Jar Mini" subtitle={`Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`} kicker="Premium fintech" />

      <Surface className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(91,140,255,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.1),transparent_30%)]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Pill tone={heroTone} className="mb-3">
                {insightBadge}
              </Pill>
              <p className="text-sm font-medium text-mjm-muted">Dư tháng này</p>
              <p className="mt-2 font-display text-[2.6rem] font-semibold leading-none tracking-[-0.06em] sm:text-[3rem]">
                <span className={heroToneClass}>
                  {conLai < 0 ? "-" : "+"}
                  {formatVnd(Math.abs(conLai))}
                </span>
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-mjm-muted">{heroCopy}</p>
            </div>
            <div className="shrink-0 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-mjm-muted">Ngày còn lại</p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-mjm-text">{daysLeft}</p>
              <p className="text-xs text-mjm-muted">/ {daysInMonth}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Tổng thu</p>
              <MoneyText amount={thu} type="income" />
            </div>
            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Tổng chi</p>
              <MoneyText amount={chi} type="expense" />
            </div>
            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Giữ lại</p>
              <p className="font-semibold tabular-nums tracking-[-0.02em] text-mjm-text">{rate != null ? `${rate.toFixed(2)}%` : "—"}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3 text-xs text-mjm-muted">
              <span>Tốc độ chi / ngày</span>
              <span>{formatVnd(avg)}</span>
            </div>
            <ProgressBar value={burnRatio} tone={heroTone} className="mt-3 h-3" />
            <p className="mt-2 text-xs leading-5 text-mjm-muted">
              Dự kiến cả tháng: <span className="font-semibold text-mjm-text">{formatVnd(projected)}</span>
            </p>
          </div>
        </div>
      </Surface>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/quick?mode=chi"
          className="group rounded-[24px] border border-mjm-expense/25 bg-mjm-expense/10 p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-mjm-expense/14"
        >
          <Pill tone="expense">Chi</Pill>
          <p className="mt-3 font-display text-[1.15rem] font-semibold tracking-[-0.03em] text-mjm-text">Ghi chi nhanh</p>
          <p className="mt-1 text-sm leading-6 text-mjm-muted">Mở form hoặc nhập text trong một chạm.</p>
        </Link>
        <Link
          to="/quick?mode=thu"
          className="group rounded-[24px] border border-mjm-income/25 bg-mjm-income/10 p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-mjm-income/14"
        >
          <Pill tone="income">Thu</Pill>
          <p className="mt-3 font-display text-[1.15rem] font-semibold tracking-[-0.03em] text-mjm-text">Ghi thu nhanh</p>
          <p className="mt-1 text-sm leading-6 text-mjm-muted">Lương, hoàn tiền, thưởng, hay thu nhập phụ.</p>
        </Link>
        <Link
          to="/quick?tab=transfer"
          className="group rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.05]"
        >
          <Pill tone="accent">Ví</Pill>
          <p className="mt-3 font-display text-[1.15rem] font-semibold tracking-[-0.03em] text-mjm-text">Chuyển ví</p>
          <p className="mt-1 text-sm leading-6 text-mjm-muted">Rút tiền, nạp tiền, hay chuyển sang tiết kiệm.</p>
        </Link>
        <Link
          to="/quick"
          className="group rounded-[24px] border border-white/10 bg-mjm-accent/16 p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-mjm-accent/20"
        >
          <Pill tone="accent">AI</Pill>
          <p className="mt-3 font-display text-[1.15rem] font-semibold tracking-[-0.03em] text-mjm-text">Nhập nhanh</p>
          <p className="mt-1 text-sm leading-6 text-mjm-muted">Text parsing có gợi ý để vào nhanh hơn.</p>
        </Link>
      </div>

      <Surface>
        <SectionHeader kicker="Tài sản" title="Ví" subtitle="Phân bổ số dư theo từng ví" />
        <div className="space-y-3">
          {balances.length === 0 ? (
            <EmptyState title="Chưa có ví" hint="Thêm ví trong mục Thêm để xem phân bổ." />
          ) : (
            balances.map((b) => {
              const share = totalAssets > 0 ? (b.current_balance / totalAssets) * 100 : 0;
              const tone =
                b.kind === "cash" ? "neutral" : b.kind === "saving" ? "income" : b.kind === "ewallet" ? "warn" : "accent";
              const kindLabel =
                b.kind === "cash"
                  ? "Tiền mặt"
                  : b.kind === "bank"
                    ? "Ngân hàng"
                    : b.kind === "ewallet"
                      ? "Ví điện tử"
                      : b.kind === "saving"
                        ? "Tiết kiệm"
                        : b.kind === "investment"
                          ? "Đầu tư"
                          : "Khác";
              return (
                <div key={b.code} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-mjm-text">{b.name_vi}</p>
                        <Pill tone={tone}>{kindLabel}</Pill>
                      </div>
                      <p className="mt-1 text-xs text-mjm-muted">{b.code.toUpperCase()}</p>
                    </div>
                    <MoneyText amount={b.current_balance} />
                  </div>
                  <ProgressBar value={share} className="mt-3" tone="accent" />
                </div>
              );
            })
          )}
        </div>
      </Surface>

      <Surface>
        <SectionHeader kicker="Chi tiêu" title="Top danh mục" subtitle="Danh mục đang kéo chi tiêu nhiều nhất" />
        <div className="space-y-3">
          {topCat.length === 0 ? (
            <EmptyState title="Chưa có chi tiêu" hint="Khi có giao dịch, top danh mục sẽ xuất hiện ở đây." />
          ) : (
            topCat.map((c) => {
              const cat = categoryMap.get(c.category_name);
              const share = chi > 0 ? (c.total_amount / chi) * 100 : 0;
              return (
                <div key={`${c.parent_name}-${c.category_name}`} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 text-sm font-bold"
                      style={{
                        backgroundColor: cat?.color ? `${cat.color}1A` : "rgba(255,255,255,0.04)",
                        color: cat?.color ?? "var(--mjm-text)"
                      }}
                    >
                      {cat?.icon ?? "•"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-mjm-text">{c.category_name}</p>
                          <p className="text-xs text-mjm-muted">{c.parent_name}</p>
                        </div>
                        <MoneyText amount={c.total_amount} type="expense" />
                      </div>
                      <ProgressBar value={share} tone="expense" className="mt-3" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Surface>

      <Surface>
        <SectionHeader kicker="6 hũ" title="Ngân sách hũ" subtitle="Theo dõi mức tiêu hao theo kế hoạch thu nhập" />
        <div className="space-y-3">
          {jarsMeta.map((j) => {
            const row = byJar.find((x) => x.jar_code === j.code);
            const spent = row?.actual_amount ?? 0;
            const pct = j.target_percent;
            const budget = plannedIncome > 0 && pct != null ? Math.round((plannedIncome * pct) / 100) : 0;
            const usedPct = budget > 0 ? (spent / budget) * 100 : spent > 0 ? 100 : 0;
            const warn = usedPct >= 100 ? "expense" : usedPct >= 80 ? "warn" : "accent";
            return (
              <div key={j.code} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-mjm-text">{j.name_vi}</p>
                    <p className="mt-1 text-xs text-mjm-muted">
                      Đã chi {formatVnd(spent)}
                      {budget > 0 ? ` / kế hoạch ${formatVnd(budget)}` : ""}
                    </p>
                  </div>
                  <Pill tone={warn}>{Math.round(Math.min(100, usedPct))}%</Pill>
                </div>
                <ProgressBar value={usedPct} tone={warn} className="mt-3" />
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}
