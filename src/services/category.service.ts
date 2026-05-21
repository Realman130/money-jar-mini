import { supabase } from "@/lib/supabase";
import type { CategoryRow } from "@/types/domain";

export async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, type, parent_name, name, icon, color, jar_id, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order");
  if (error) {
    throw error;
  }
  return (data ?? []) as CategoryRow[];
}

export async function buildCategoryAliasMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("category_aliases").select("alias, category_id");
  if (error) {
    throw error;
  }
  const m = new Map<string, string>();
  for (const row of data ?? []) {
    const k = String(row.alias)
      .trim()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/đ/g, "d")
      .toLowerCase();
    m.set(k, row.category_id as string);
  }
  return m;
}

export async function createCategory(input: Omit<CategoryRow, "id" | "is_active">): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      type: input.type,
      parent_name: input.parent_name,
      name: input.name,
      icon: input.icon || "📁",
      color: input.color || "#64748b",
      jar_id: input.jar_id || null,
      sort_order: input.sort_order ?? 0,
      is_active: true
    })
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data as CategoryRow;
}

export async function updateCategory(id: string, input: Partial<Omit<CategoryRow, "id">>): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .update(input)
    .eq("id", id);
  if (error) {
    throw error;
  }
}

