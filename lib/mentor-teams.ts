import { getSupabaseServerClient } from "@/lib/supabase-server"

export interface MentorTeam {
  studentUserId: string
  loginId: string
  teamName: string | null
  teamLeadName: string | null
  teamLogoUrl: string | null
  domainId: string | null
  venue: string | null
  problemStatement: string | null
  solutionShort: string | null
  solutionLong: string | null
}

export async function getMyTeams(mentorUserId: string): Promise<MentorTeam[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_my_teams", { p_mentor_user_id: mentorUserId })
  return (
    (data ?? []) as {
      student_user_id: string
      login_id: string
      team_name: string | null
      team_lead_name: string | null
      team_logo_url: string | null
      domain_id: string | null
      venue: string | null
      problem_statement: string | null
      solution_short: string | null
      solution_long: string | null
    }[]
  ).map((row) => ({
    studentUserId: row.student_user_id,
    loginId: row.login_id,
    teamName: row.team_name,
    teamLeadName: row.team_lead_name,
    teamLogoUrl: row.team_logo_url,
    domainId: row.domain_id,
    venue: row.venue,
    problemStatement: row.problem_statement,
    solutionShort: row.solution_short,
    solutionLong: row.solution_long,
  }))
}
