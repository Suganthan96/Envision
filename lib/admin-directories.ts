import { getSupabaseServerClient } from "@/lib/supabase-server"
import { mentorAvatarUrl, teamLogoUrl } from "@/lib/image-url"

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
  mentorUserId: string | null
  mentorName: string | null
  mentorLoginId: string | null
  submissionDriveUrl: string | null
  submissionCanvaUrl: string | null
  submissionUpdatedAt: string | null
}

export async function getMentorProfilesForAdmin(adminUserId: string): Promise<AdminMentorProfile[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_mentor_profiles", { p_admin_user_id: adminUserId })
  return (
    (data ?? []) as {
      mentor_user_id: string
      login_id: string
      name: string | null
      avatar_version: string | null
      bio: string | null
      venue: string | null
      domain_ids: string[]
    }[]
  ).map((row) => ({
    mentorUserId: row.mentor_user_id,
    loginId: row.login_id,
    name: row.name,
    avatarUrl: mentorAvatarUrl(row.login_id, row.avatar_version),
    bio: row.bio,
    venue: row.venue,
    domainIds: row.domain_ids ?? [],
  }))
}

export interface AdminSubmissionRow {
  studentUserId: string
  loginId: string
  teamName: string | null
  teamLeadName: string | null
  projectTitle: string | null
  venue: string | null
  domainId: string | null
  mentorUserId: string | null
  mentorName: string | null
  driveUrl: string | null
  canvaUrl: string | null
  updatedAt: string | null
}

export async function getSubmissionsForAdmin(adminUserId: string): Promise<AdminSubmissionRow[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_submissions", { p_admin_user_id: adminUserId })
  return (
    (data ?? []) as {
      student_user_id: string
      login_id: string
      team_name: string | null
      team_lead_name: string | null
      project_title: string | null
      venue: string | null
      domain_id: string | null
      mentor_user_id: string | null
      mentor_name: string | null
      submission_canva_url: string | null
      submission_file_url: string | null
      submission_updated_at: string | null
    }[]
  ).map((row) => ({
    studentUserId: row.student_user_id,
    loginId: row.login_id,
    teamName: row.team_name,
    teamLeadName: row.team_lead_name,
    projectTitle: row.project_title,
    venue: row.venue,
    domainId: row.domain_id,
    mentorUserId: row.mentor_user_id,
    mentorName: row.mentor_name,
    driveUrl: row.submission_file_url,
    canvaUrl: row.submission_canva_url,
    updatedAt: row.submission_updated_at,
  }))
}

type TeamProfileRow = {
  student_user_id: string
  login_id: string
  team_name: string | null
  team_lead_name: string | null
  team_logo_version: string | null
  venue: string | null
  domain_id: string | null
  project_title: string | null
  problem_statement: string | null
  solution_short: string | null
  solution_long: string | null
  member_count: number
  mentor_user_id: string | null
  mentor_name: string | null
  mentor_login_id: string | null
  submission_canva_url: string | null
  submission_file_url: string | null
  submission_updated_at: string | null
}

function mapTeamProfile(row: TeamProfileRow): AdminTeamProfile {
  return {
    studentUserId: row.student_user_id,
    loginId: row.login_id,
    teamName: row.team_name,
    teamLeadName: row.team_lead_name,
    teamLogoUrl: teamLogoUrl(row.login_id, row.team_logo_version),
    venue: row.venue,
    domainId: row.domain_id,
    projectTitle: row.project_title,
    problemStatement: row.problem_statement,
    solutionShort: row.solution_short,
    solutionLong: row.solution_long,
    memberCount: row.member_count,
    mentorUserId: row.mentor_user_id,
    mentorName: row.mentor_name,
    mentorLoginId: row.mentor_login_id,
    submissionDriveUrl: row.submission_file_url,
    submissionCanvaUrl: row.submission_canva_url,
    submissionUpdatedAt: row.submission_updated_at,
  }
}

export async function getTeamProfilesForAdmin(adminUserId: string): Promise<AdminTeamProfile[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_team_profiles", { p_admin_user_id: adminUserId })
  return ((data ?? []) as TeamProfileRow[]).map(mapTeamProfile)
}

/** Single-row equivalent for the team detail page — avoids pulling the whole
 *  directory just to pick one record out of it in JS. */
export async function getTeamProfileForAdmin(
  adminUserId: string,
  studentUserId: string,
): Promise<AdminTeamProfile | null> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_get_team_profile", {
    p_admin_user_id: adminUserId,
    p_student_user_id: studentUserId,
  })
  const row = (data as TeamProfileRow[] | null)?.[0]
  return row ? mapTeamProfile(row) : null
}

/** Single-row equivalent for the mentor detail page. */
export async function getMentorProfileForAdmin(
  adminUserId: string,
  mentorUserId: string,
): Promise<AdminMentorProfile | null> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_get_mentor_profile", {
    p_admin_user_id: adminUserId,
    p_mentor_user_id: mentorUserId,
  })
  const row = (data as {
    mentor_user_id: string
    login_id: string
    name: string | null
    avatar_version: string | null
    bio: string | null
    venue: string | null
    domain_ids: string[]
  }[] | null)?.[0]
  if (!row) return null
  return {
    mentorUserId: row.mentor_user_id,
    loginId: row.login_id,
    name: row.name,
    avatarUrl: mentorAvatarUrl(row.login_id, row.avatar_version),
    bio: row.bio,
    venue: row.venue,
    domainIds: row.domain_ids ?? [],
  }
}
