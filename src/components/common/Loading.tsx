export function Loading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-mjm-muted">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-mjm-border border-t-mjm-accent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
