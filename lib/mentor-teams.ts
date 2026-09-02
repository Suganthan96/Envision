import { getSupabaseServerClient } from "@/lib/supabase-server"
import { teamLogoUrl } from "@/lib/image-url"

export interface MentorTeam {
  studentUserId: string
  loginId: string
  teamName: string | null
  teamLeadName: string | null
  teamLogoUrl: string | null
  domainId: string | null
  venue: string | null
  projectTitle: string | null
  problemStatement: string | null
  solutionShort: string | null
  solutionLong: string | null
  memberCount: number
  submissionDriveUrl: string | null
  submissionCanvaUrl: string | null
  submissionUpdatedAt: string | null
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
      team_logo_version: string | null
      domain_id: string | null
      venue: string | null
      project_title: string | null
      problem_statement: string | null
      solution_short: string | null
      solution_long: string | null
      member_count: number
      submission_canva_url: string | null
      submission_file_url: string | null
      submission_updated_at: string | null
    }[]
  ).map((row) => ({
    studentUserId: row.student_user_id,
    loginId: row.login_id,
    teamName: row.team_name,
    teamLeadName: row.team_lead_name,
    teamLogoUrl: teamLogoUrl(row.login_id, row.team_logo_version),
    domainId: row.domain_id,
    venue: row.venue,
    projectTitle: row.project_title,
    problemStatement: row.problem_statement,
    solutionShort: row.solution_short,
    solutionLong: row.solution_long,
    memberCount: row.member_count,
    submissionDriveUrl: row.submission_file_url,
    submissionCanvaUrl: row.submission_canva_url,
    submissionUpdatedAt: row.submission_updated_at,
  }))
}
