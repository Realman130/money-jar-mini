export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-mjm-border bg-mjm-surface/60 px-4 py-10 text-center">
      <p className="text-mjm-text font-medium">{title}</p>
      {hint ? <p className="mt-2 text-sm text-mjm-muted">{hint}</p> : null}
    </div>
  );
}
