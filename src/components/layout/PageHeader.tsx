import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  subtitle,
  action,
  kicker,
  className
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  kicker?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-4 flex items-end justify-between gap-3 px-1", className)}>
      <div className="min-w-0">
        {kicker ? <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-mjm-muted">{kicker}</p> : null}
        <h1 className="mt-1 font-display text-[1.5rem] font-semibold tracking-[-0.04em] text-mjm-text">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-md text-sm leading-6 text-mjm-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
