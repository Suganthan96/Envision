import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function getTeamLogo(userId: string): Promise<string | null> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_team_logo", { p_user_id: userId })
  return (data as string | null) ?? null
}
