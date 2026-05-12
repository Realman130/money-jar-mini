export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-4 px-1">
      <h1 className="text-xl font-bold tracking-tight text-mjm-text">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-mjm-muted">{subtitle}</p> : null}
    </header>
  );
}
