import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

const cardBase =
  "rounded-[28px] border border-white/10 bg-mjm-surface/90 p-4 shadow-[0_24px_60px_rgba(2,6,23,0.28)] backdrop-blur-xl";
const softCardBase = "rounded-[24px] border border-mjm-border/80 bg-white/[0.03] p-3 shadow-[0_16px_40px_rgba(2,6,23,0.18)]";

export function Surface({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return <section className={cn(cardBase, className)}>{children}</section>;
}

export function SoftSurface({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return <section className={cn(softCardBase, className)}>{children}</section>;
}

export function SectionHeader({
  kicker,
  title,
  subtitle,
  action
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker ? <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-mjm-muted">{kicker}</p> : null}
        <h2 className="mt-1 font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-mjm-text">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-mjm-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const toneClasses = {
  neutral: "text-mjm-text",
  accent: "text-mjm-accent",
  income: "text-mjm-income",
  expense: "text-mjm-expense",
  warn: "text-mjm-warn"
} as const;

export function MetricCard({
  label,
  value,
  hint,
  badge,
  tone = "neutral",
  className
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  badge?: ReactNode;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return (
    <div className={cn(softCardBase, className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-mjm-muted">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={cn("font-display text-[1.7rem] font-semibold leading-none tracking-[-0.04em]", toneClasses[tone])}>{value}</div>
          {hint ? <p className="mt-1 text-xs leading-5 text-mjm-muted">{hint}</p> : null}
        </div>
        {badge ? (
          <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mjm-muted">
            {badge}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "accent",
  className
}: {
  value: number;
  tone?: "accent" | "income" | "expense" | "warn";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillClass =
    tone === "income" ? "bg-mjm-income" : tone === "expense" ? "bg-mjm-expense" : tone === "warn" ? "bg-mjm-warn" : "bg-mjm-accent";

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-white/[0.05]", className)} aria-hidden="true">
      <div className={cn("h-full rounded-full shadow-[0_0_18px_rgba(96,165,250,0.24)]", fillClass)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

const pillClasses = {
  neutral: "border-mjm-border bg-white/[0.03] text-mjm-muted",
  accent: "border-mjm-accent/30 bg-mjm-accent/14 text-mjm-accent",
  income: "border-mjm-income/30 bg-mjm-income/14 text-mjm-income",
  expense: "border-mjm-expense/30 bg-mjm-expense/14 text-mjm-expense",
  warn: "border-mjm-warn/30 bg-mjm-warn/14 text-mjm-warn"
} as const;

export function Pill({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: keyof typeof pillClasses;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
        pillClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ActionTile({
  to,
  icon,
  title,
  subtitle,
  badge
}: {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-[24px] border border-mjm-border/80 bg-white/[0.03] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05] active:translate-y-0"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg text-mjm-text">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold text-mjm-text">{title}</p>
            {badge ? <div className="shrink-0">{badge}</div> : null}
            <span className="text-mjm-muted transition group-hover:translate-x-0.5">→</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-mjm-muted">{subtitle}</p>
        </div>
      </div>
    </Link>
  );
}
