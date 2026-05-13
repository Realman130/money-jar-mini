export function Loading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-mjm-muted">
      <div className="relative h-11 w-11">
        <div className="absolute inset-0 animate-pulse rounded-full bg-mjm-accent/18 blur-md" />
        <div className="absolute inset-1 animate-spin rounded-full border-2 border-white/10 border-t-mjm-accent" />
      </div>
      <p className="text-sm font-medium tracking-[0.02em]">{label}</p>
    </div>
  );
}
