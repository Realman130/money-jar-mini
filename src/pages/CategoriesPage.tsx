import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Pill, SectionHeader, Surface } from "@/components/common/Fintech";
import { useApp } from "@/context/AppContext";
import { createCategory, updateCategory } from "@/services/category.service";
import { getJars } from "@/services/report.service";
import type { CategoryRow } from "@/types/domain";

const fieldClass =
  "w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text placeholder:text-mjm-muted outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15";

export function CategoriesPage() {
  const { categories, ready, error, refreshCatalog } = useApp();

  const [showSheet, setShowSheet] = useState(false);
  const [selectedCat, setSelectedCat] = useState<CategoryRow | null>(null);

  const [formType, setFormType] = useState<"thu" | "chi">("chi");
  const [formParentName, setFormParentName] = useState("");
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("📁");
  const [formColor, setFormColor] = useState("#64748b");
  const [formJarId, setFormJarId] = useState<string>("");
  const [formSortOrder, setFormSortOrder] = useState("0");

  const [jars, setJars] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getJars().then((data) => setJars(data)).catch(console.error);
  }, []);

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

  const existingParents = useMemo(() => {
    const set = new Set<string>();
    for (const c of categories) {
      set.add(c.parent_name);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [categories]);

  const total = categories.length;
  const incomeCount = categories.filter((c) => c.type === "thu").length;
  const expenseCount = categories.filter((c) => c.type === "chi").length;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const openAdd = () => {
    setSelectedCat(null);
    setFormType("chi");
    setFormParentName("");
    setFormName("");
    setFormIcon("📁");
    setFormColor("#64748b");
    setFormJarId("");
    setFormSortOrder("0");
    setShowSheet(true);
  };

  const openEdit = (c: CategoryRow) => {
    setSelectedCat(c);
    setFormType(c.type);
    setFormParentName(c.parent_name);
    setFormName(c.name);
    setFormIcon(c.icon);
    setFormColor(c.color);
    setFormJarId(c.jar_id ?? "");
    setFormSortOrder(String(c.sort_order));
    setShowSheet(true);
  };

  const closeSheet = () => {
    setShowSheet(false);
    setSelectedCat(null);
  };

  const handleSave = async () => {
    const parent = formParentName.trim();
    const name = formName.trim();
    const icon = formIcon.trim() || "📁";
    const color = formColor.trim() || "#64748b";
    const jarId = formJarId || null;
    const sortOrder = Number.parseInt(formSortOrder, 10) || 0;

    if (!parent || !name) {
      showToast("Vui lòng điền Nhóm cha và Tên danh mục");
      return;
    }

    setSaving(true);
    try {
      if (selectedCat) {
        await updateCategory(selectedCat.id, {
          type: formType,
          parent_name: parent,
          name,
          icon,
          color,
          jar_id: jarId,
          sort_order: sortOrder
        });
        showToast("Đã cập nhật danh mục");
      } else {
        await createCategory({
          type: formType,
          parent_name: parent,
          name,
          icon,
          color,
          jar_id: jarId,
          sort_order: sortOrder
        });
        showToast("Đã thêm danh mục mới");
      }
      await refreshCatalog();
      closeSheet();
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCat) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${selectedCat.name}"?`)) {
      return;
    }
    setSaving(true);
    try {
      await updateCategory(selectedCat.id, { is_active: false });
      showToast("Đã xóa danh mục");
      await refreshCatalog();
      closeSheet();
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!ready || error) {
    return <EmptyState title="Chưa kết nối" hint={error ?? ""} />;
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Danh mục"
        subtitle="Quản lý và tổ chức các hạng mục chi tiêu/thu nhập."
        kicker="Catalog"
        action={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex rounded-full border border-mjm-accent bg-mjm-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-mjm-accent transition hover:bg-mjm-accent hover:text-white"
          >
            + Thêm mới
          </button>
        }
      />

      <Surface className="space-y-4">
        <SectionHeader title="Thống kê danh mục" subtitle="Tổng quan số lượng danh mục đang hoạt động." />
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
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openEdit(c)}
                    className="flex w-full items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/12 hover:bg-white/[0.05]"
                  >
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 text-sm font-bold"
                      style={{ backgroundColor: `${c.color}1A`, color: c.color }}
                    >
                      {c.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-mjm-text">{c.name}</p>
                      <p className="mt-1 text-xs text-mjm-muted">
                        Hũ: {c.jar_id ? jars.find((j) => j.id === c.jar_id)?.name_vi ?? "Đã gán" : "Chưa gán"}
                      </p>
                    </div>
                    <Pill tone={c.type === "thu" ? "income" : "expense"}>{c.type === "thu" ? "Thu" : "Chi"}</Pill>
                  </button>
                ))}
            </div>
          </Surface>
        ))}
      </div>

      {showSheet && (
        <div className="fixed inset-0 z-50 animate-fade-in" role="dialog" aria-modal="true">
          <div aria-hidden="true" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSheet} />
          <div className="absolute inset-x-3 bottom-3 mx-auto max-h-[85vh] w-auto max-w-[430px] overflow-y-auto rounded-[32px] border border-white/10 bg-[#0c131f]/96 p-4 shadow-[0_30px_90px_rgba(2,6,23,0.55)] outline-none">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-semibold text-mjm-text">
                {selectedCat ? "Sửa danh mục" : "Thêm danh mục"}
              </h3>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-mjm-text"
                onClick={closeSheet}
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Type selector */}
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Loại giao dịch</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType("chi")}
                    className={`rounded-[18px] py-2.5 font-semibold transition ${formType === "chi" ? "bg-mjm-expense text-white" : "border border-white/10 bg-white/[0.02] text-mjm-muted"}`}
                  >
                    Chi tiêu
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("thu")}
                    className={`rounded-[18px] py-2.5 font-semibold transition ${formType === "thu" ? "bg-mjm-income text-white" : "border border-white/10 bg-white/[0.02] text-mjm-muted"}`}
                  >
                    Thu nhập
                  </button>
                </div>
              </div>

              {/* Parent Group */}
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Nhóm cha (ví dụ: Ăn uống, Hàng ngày...)</span>
                <input
                  type="text"
                  value={formParentName}
                  onChange={(e) => setFormParentName(e.target.value)}
                  placeholder="Nhập tên nhóm cha..."
                  className={fieldClass}
                />
                {existingParents.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {existingParents.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormParentName(p)}
                        className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-xs text-mjm-muted transition hover:bg-white/10"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Name */}
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Tên danh mục</span>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Ăn trưa, Cà phê, Đi chợ..."
                  className={fieldClass}
                />
              </div>

              {/* Icon & Color Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Emoji Icon</span>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    placeholder="📁"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Màu Hex</span>
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    placeholder="#64748b"
                    className={fieldClass}
                  />
                </div>
              </div>

              {/* Jar Selection */}
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Hũ tài chính (Jars)</span>
                <select
                  value={formJarId}
                  onChange={(e) => setFormJarId(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">-- Không gán hũ --</option>
                  {jars.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name_vi} ({j.code.toUpperCase()} - {j.target_percent}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Thứ tự sắp xếp</span>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(e.target.value)}
                  className={fieldClass}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="rounded-[18px] bg-mjm-accent py-3 font-semibold text-white transition hover:bg-mjm-accent/80 disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu lại"}
                </button>
                {selectedCat ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleDelete}
                    className="rounded-[18px] border border-mjm-danger/30 bg-mjm-danger/12 py-3 font-semibold text-mjm-danger transition hover:bg-mjm-danger/20 disabled:opacity-50"
                  >
                    Xóa bỏ
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="rounded-[18px] border border-white/10 bg-white/[0.03] py-3 font-semibold text-mjm-text transition hover:bg-white/[0.08]"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-mjm-accent px-4 py-2 text-xs font-semibold text-white shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
