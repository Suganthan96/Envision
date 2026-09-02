import { unstable_cache } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { mentorAvatarUrl, teamLogoUrl } from "@/lib/image-url"
import { CACHE_TAGS } from "@/lib/cache-tags"

/**
 * `teamLogoUrl` / `avatarUrl` are URLs into /api/img/*, not the raw base64
 * data URIs stored in the database — see lib/image-response.ts for why.
 */
export interface PublicShowcaseTeam {
  studentUserId: string
  loginId: string
  teamName: string | null
  teamLeadName: string | null
  teamLogoUrl: string | null
  domainId: string | null
  projectTitle: string | null
  solutionShort: string | null
  memberNames: string[]
  mentorName: string | null
}

/** The detail page additionally shows the long-form write-up, which the grid
 *  never renders — so only the single-row RPC returns these. */
export interface PublicShowcaseTeamDetail extends PublicShowcaseTeam {
  problemStatement: string | null
  solutionLong: string | null
}

export interface PublicShowcaseMentor {
  mentorUserId: string
  loginId: string
  name: string | null
  avatarUrl: string | null
  bio: string | null
  domainIds: string[]
}

type TeamRow = {
  student_user_id: string
  login_id: string
  team_name: string | null
  team_lead_name: string | null
  team_logo_version: string | null
  domain_id: string | null
  project_title: string | null
  solution_short: string | null
  member_names: string[] | null
  mentor_name: string | null
}

function mapTeam(row: TeamRow): PublicShowcaseTeam {
  return {
    studentUserId: row.student_user_id,
    loginId: row.login_id,
    teamName: row.team_name,
    teamLeadName: row.team_lead_name,
    teamLogoUrl: teamLogoUrl(row.login_id, row.team_logo_version),
    domainId: row.domain_id,
    projectTitle: row.project_title,
    solutionShort: row.solution_short,
    memberNames: row.member_names ?? [],
    mentorName: row.mentor_name,
  }
}

// Short-lived cache (not tag-invalidated): this mirrors every team's
// in-progress project, which students edit continuously and which has no
// single admin-triggered invalidation point. A 20s window makes the
// public /showcase list near-instant on repeat hits while staying fresh
// enough that an edit shows up almost immediately.
export const getPublicShowcaseTeams = unstable_cache(
  async (): Promise<PublicShowcaseTeam[]> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("get_public_showcase_teams")
    return ((data ?? []) as TeamRow[]).map(mapTeam)
  },
  ["public-showcase-teams"],
  { revalidate: 20, tags: [CACHE_TAGS.publicShowcase] },
)

export const getPublicShowcaseTeam = unstable_cache(
  async (loginId: string): Promise<PublicShowcaseTeamDetail | null> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("get_public_showcase_team", { p_login_id: loginId })
    const row = (data as (TeamRow & {
      problem_statement: string | null
      solution_long: string | null
    })[] | null)?.[0]
    if (!row) return null
    return {
      ...mapTeam(row),
      problemStatement: row.problem_statement,
      solutionLong: row.solution_long,
    }
  },
  ["public-showcase-team"],
  { revalidate: 20, tags: [CACHE_TAGS.publicShowcase] },
)

export const getPublicMentorShowcase = unstable_cache(
  async (): Promise<PublicShowcaseMentor[]> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("get_public_mentor_showcase")
    return (
      (data ?? []) as {
        mentor_user_id: string
        login_id: string
        name: string | null
        avatar_version: string | null
        bio: string | null
        domain_ids: string[]
      }[]
    ).map((row) => ({
      mentorUserId: row.mentor_user_id,
      loginId: row.login_id,
      name: row.name,
      avatarUrl: mentorAvatarUrl(row.login_id, row.avatar_version),
      bio: row.bio,
      domainIds: row.domain_ids ?? [],
    }))
  },
  ["public-mentor-showcase"],
  { revalidate: 60, tags: [CACHE_TAGS.publicShowcase] },
)
