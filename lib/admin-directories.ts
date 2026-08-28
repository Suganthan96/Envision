import { getSupabaseServerClient } from "@/lib/supabase-server"

export interface AdminMentorProfile {
  mentorUserId: string
  loginId: string
  name: string | null
  avatarUrl: string | null
  bio: string | null
  venue: string | null
  domainIds: string[]
}

export interface AdminTeamProfile {
  studentUserId: string
  loginId: string
  teamName: string | null
  teamLeadName: string | null
  teamLogoUrl: string | null
  venue: string | null
  domainId: string | null
  projectTitle: string | null
  problemStatement: string | null
  solutionShort: string | null
  solutionLong: string | null
  memberCount: number
}

export async function getMentorProfilesForAdmin(adminUserId: string): Promise<AdminMentorProfile[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_mentor_profiles", { p_admin_user_id: adminUserId })
  return (
    (data ?? []) as {
      mentor_user_id: string
      login_id: string
      name: string | null
      avatar_url: string | null
      bio: string | null
      venue: string | null
      domain_ids: string[]
    }[]
  ).map((row) => ({
    mentorUserId: row.mentor_user_id,
    loginId: row.login_id,
    name: row.name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    venue: row.venue,
    domainIds: row.domain_ids ?? [],
  }))
}

export async function getTeamProfilesForAdmin(adminUserId: string): Promise<AdminTeamProfile[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_team_profiles", { p_admin_user_id: adminUserId })
  return (
    (data ?? []) as {
      student_user_id: string
      login_id: string
      team_name: string | null
      team_lead_name: string | null
      team_logo_url: string | null
      venue: string | null
      domain_id: string | null
      project_title: string | null
      problem_statement: string | null
      solution_short: string | null
      solution_long: string | null
      member_count: number
    }[]
  ).map((row) => ({
    studentUserId: row.student_user_id,
    loginId: row.login_id,
    teamName: row.team_name,
    teamLeadName: row.team_lead_name,
    teamLogoUrl: row.team_logo_url,
    venue: row.venue,
    domainId: row.domain_id,
    projectTitle: row.project_title,
    problemStatement: row.problem_statement,
    solutionShort: row.solution_short,
    solutionLong: row.solution_long,
    memberCount: row.member_count,
  }))
}
