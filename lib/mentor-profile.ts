import { getSupabaseServerClient } from "@/lib/supabase-server"

export interface MentorProfile {
  avatarUrl: string | null
  bio: string | null
}

export interface AssignedMentor {
  name: string | null
  loginId: string
  avatarUrl: string | null
  bio: string | null
}

export async function getMentorProfile(userId: string): Promise<MentorProfile> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_mentor_profile", { p_user_id: userId })
  const row = data?.[0]
  return { avatarUrl: row?.avatar_url ?? null, bio: row?.bio ?? null }
}

export async function getMyMentor(studentUserId: string): Promise<AssignedMentor | null> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_my_mentor", { p_student_user_id: studentUserId })
  const row = data?.[0]
  if (!row) return null
  return { name: row.name, loginId: row.login_id, avatarUrl: row.avatar_url, bio: row.bio }
}
