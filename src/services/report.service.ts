import { monthStart } from "@/lib/date";
import { supabase } from "@/lib/supabase";

export async function getMonthlySummary(uid: number, month: string) {
  const { data, error } = await supabase
    .from("v_monthly_summary")
    .select("*")
    .eq("telegram_user_id", uid)
    .eq("month_date", month)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export async function getDailyFlow(uid: number, from: string, to: string) {
  const { data, error } = await supabase
    .from("v_daily_flow")
    .select("*")
    .eq("telegram_user_id", uid)
    .gte("transaction_date", from)
    .lte("transaction_date", to)
    .order("transaction_date");
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getExpenseByCategory(uid: number, month: string) {
  const { data, error } = await supabase
    .from("v_monthly_expense_by_category")
    .select("*")
    .eq("telegram_user_id", uid)
    .eq("month_date", month)
    .order("total_amount", { ascending: false });
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getExpenseByJar(uid: number, month: string) {
  const { data, error } = await supabase
    .from("v_monthly_expense_by_jar")
    .select("*")
    .eq("telegram_user_id", uid)
    .eq("month_date", month)
    .order("jar_code");
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getJars() {
  const { data, error } = await supabase.from("jars").select("*").order("sort_order");
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getMonthlyIncomePlan(uid: number, month: string) {
  const { data, error } = await supabase
    .from("monthly_income_plans")
    .select("*")
    .eq("telegram_user_id", uid)
    .eq("month_date", month)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export async function saveMonthlyIncomePlan(uid: number, month: string, expected_income: number) {
  const { error } = await supabase.from("monthly_income_plans").upsert(
    { telegram_user_id: uid, month_date: month, expected_income },
    { onConflict: "telegram_user_id,month_date" }
  );
  if (error) {
    throw error;
  }
}

export function currentMonthStart(): string {
  return monthStart();
}
