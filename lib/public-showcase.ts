import { editionCached } from "@/lib/edition"
import { editionStore } from "@/lib/edition-context"
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

// supabase-js reports network failures as `{ data: null, error }` rather
// than throwing. Swallowing that would let unstable_cache store an empty
// result — on the detail page that is a cached `null`, which renders as a
// 404 until the cache expires (and AutoRefresh re-renders every 30s, so a
// page left open eventually hits one). Retry once, then throw so the failure
// is never cached and never mistaken for "team doesn't exist".
async function rpcOrThrow<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseServerClient()
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase.rpc(fn, args)
    if (!error) return data as T
    lastError = error
  }
  throw new Error(`${fn} failed: ${(lastError as { message?: string })?.message ?? lastError}`)
}

function mapTeam(row: TeamRow): PublicShowcaseTeam {
  return {
    studentUserId: row.student_user_id,
    loginId: row.login_id,
    teamName: row.team_name,
    teamLeadName: row.team_lead_name,
    teamLogoUrl: teamLogoUrl(row.login_id, row.team_logo_version, editionStore.getStore()),
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
export const getPublicShowcaseTeams = editionCached(
  async (): Promise<PublicShowcaseTeam[]> => {
    const data = await rpcOrThrow<TeamRow[] | null>("get_public_showcase_teams")
    return (data ?? []).map(mapTeam)
  },
  ["public-showcase-teams"],
  { revalidate: 20, tags: [CACHE_TAGS.publicShowcase] },
)

export const getPublicShowcaseTeam = editionCached(
  async (loginId: string): Promise<PublicShowcaseTeamDetail | null> => {
    const data = await rpcOrThrow<(TeamRow & {
      problem_statement: string | null
      solution_long: string | null
    })[] | null>("get_public_showcase_team", { p_login_id: loginId })
    const row = data?.[0]
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

export const getPublicMentorShowcase = editionCached(
  async (): Promise<PublicShowcaseMentor[]> => {
    const data = await rpcOrThrow<unknown[] | null>("get_public_mentor_showcase")
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
      avatarUrl: mentorAvatarUrl(row.login_id, row.avatar_version, editionStore.getStore()),
      bio: row.bio,
      domainIds: row.domain_ids ?? [],
    }))
  },
  ["public-mentor-showcase"],
  { revalidate: 60, tags: [CACHE_TAGS.publicShowcase] },
)
