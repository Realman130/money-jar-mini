import { supabase } from "@/lib/supabase";

export async function upsertTelegramUser(uid: number, profile: { username?: string; first_name?: string; last_name?: string }): Promise<void> {
  const { error } = await supabase.from("users").upsert(
    {
      telegram_user_id: uid,
      username: profile.username ?? null,
      first_name: profile.first_name ?? null,
      last_name: profile.last_name ?? null,
      last_seen_at: new Date().toISOString()
    },
    { onConflict: "telegram_user_id" }
  );
  if (error) {
    throw error;
  }
  await supabase.rpc("mjm_seed_wallets_for_user", { p_uid: uid });
}
