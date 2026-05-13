import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Pill, SectionHeader, Surface } from "@/components/common/Fintech";
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

  const total = categories.length;
  const incomeCount = categories.filter((c) => c.type === "thu").length;
  const expenseCount = categories.filter((c) => c.type === "chi").length;

  if (!ready || error) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Danh mục" subtitle="Tổ chức theo nhóm cha và icon gốc từ dữ liệu." kicker="Catalog" />

      <Surface className="space-y-4">
        <SectionHeader title="Bộ danh mục" subtitle="Dùng cho cả thu lẫn chi, đã sắp xếp theo nhóm." />
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Tổng</p>
            <p className="mt-1 font-semibold text-mjm-text">{total}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Thu</p>
            <p className="mt-1 font-semibold text-mjm-text">{incomeCount}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Chi</p>
            <p className="mt-1 font-semibold text-mjm-text">{expenseCount}</p>
          </div>
        </div>
      </Surface>

      <div className="space-y-4">
        {grouped.map(([parent, items]) => (
          <Surface key={parent} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-mjm-muted">{parent}</p>
                <p className="mt-1 text-sm text-mjm-muted">{items.length} danh mục</p>
              </div>
              <Pill tone={items[0]?.type === "thu" ? "income" : "expense"}>{items[0]?.type === "thu" ? "Thu" : "Chi"}</Pill>
            </div>
            <div className="space-y-2">
              {items
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] px-3 py-3">
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 text-sm font-bold"
                      style={{ backgroundColor: `${c.color}1A`, color: c.color }}
                    >
                      {c.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-mjm-text">{c.name}</p>
                      <p className="mt-1 text-xs text-mjm-muted">Hũ: {c.jar_id ? "Đã gán" : "Chưa gán"}</p>
                    </div>
                    <Pill tone={c.type === "thu" ? "income" : "expense"}>{c.type === "thu" ? "Thu" : "Chi"}</Pill>
                  </div>
                ))}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
