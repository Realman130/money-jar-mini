export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center shadow-[0_20px_50px_rgba(2,6,23,0.18)]">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-lg text-mjm-accent">
        ◌
      </div>
      <p className="font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-mjm-text">{title}</p>
      {hint ? <p className="mt-2 text-sm leading-6 text-mjm-muted">{hint}</p> : null}
    </div>
  );
}
