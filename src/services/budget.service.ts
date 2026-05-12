import { supabase } from "@/lib/supabase";

export async function getJarMonthlyPlans(uid: number, month: string) {
  const { data, error } = await supabase
    .from("jar_monthly_plans")
    .select("*")
    .eq("telegram_user_id", uid)
    .eq("month_date", month);
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function saveJarPercent(uid: number, month: string, jarId: string, target_percent: number) {
  const { error } = await supabase.from("jar_monthly_plans").upsert(
    {
      telegram_user_id: uid,
      month_date: month,
      jar_id: jarId,
      target_percent
    },
    { onConflict: "telegram_user_id,month_date,jar_id" }
  );
  if (error) {
    throw error;
  }
}
