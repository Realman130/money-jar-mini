import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useApp } from "@/context/AppContext";

export function CategoriesPage() {
  const { categories, ready, error } = useApp();

  const grouped = useMemo(() => {
    const m = new Map<string, typeof categories>();
    for (const c of categories) {
      if (!m.has(c.parent_name)) {
        m.set(c.parent_name, []);
      }
      m.get(c.parent_name)!.push(c);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi"));
  }, [categories]);

  if (!ready || error) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }

  return (
    <div>
      <PageHeader title="Danh mục" subtitle="Theo nhóm cha" />
      <div className="space-y-4">
        {grouped.map(([parent, items]) => (
          <section key={parent}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mjm-muted">{parent}</h3>
            <div className="space-y-1">
              {items
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-xl border border-mjm-border bg-mjm-surface px-3 py-2">
                    <span>{c.icon}</span>
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="ml-auto text-xs text-mjm-muted">{c.type === "thu" ? "Thu" : "Chi"}</span>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
