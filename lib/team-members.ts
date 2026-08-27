import { getSupabaseServerClient } from "@/lib/supabase-server"

export interface TeamMember {
  id: string
  name: string
  email: string | null
  department: string | null
}

export async function getTeamMembers(userId: string): Promise<TeamMember[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_team_members", { p_user_id: userId })
  return (data as TeamMember[] | null) ?? []
}
