import { unstable_cache } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { CACHE_TAGS } from "@/lib/cache-tags"

export interface JudgingVenue {
  id: string
  name: string
  sortOrder: number
}

export type JudgingScope = "team" | "mentor" | "theme"

/** 'judging' = the room a team presents in; 'waiting' = where it waits. */
export type VenueKind = "judging" | "waiting"

export interface JudgingAssignment {
  kind: VenueKind
  scope: JudgingScope
  refId: string
  venueId: string
}

export interface RubricRow {
  label: string
  max: number
}

export interface JudgingSettings {
  reportHeading: string
  rubric: RubricRow[]
  facultyHeading: string
  facultyTiming: string
}

export const DEFAULT_RUBRIC: RubricRow[] = [
  { label: "Background Study", max: 10 },
  { label: "Problem Statement", max: 15 },
  { label: "User Identification", max: 10 },
  { label: "Solution", max: 5 },
  { label: "Team work and presentation", max: 10 },
]

// Judging venues, assignments and settings are admin-managed and change only
// via /api/admin/judging, which purges the `judging` tag. Caching them keeps
// /admin/submissions — which loads six datasets at once — off the database on
// every view. The admin id is part of the cache key (it is an argument), so
// the authorization check inside each RPC still runs on a cache miss.
export const getJudgingVenues = unstable_cache(
  async (adminUserId: string, kind: VenueKind = "judging"): Promise<JudgingVenue[]> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("admin_list_judging_venues", {
      p_admin_user_id: adminUserId,
      p_kind: kind,
    })
    return ((data ?? []) as { id: string; name: string; sort_order: number }[]).map((r) => ({
      id: r.id,
      name: r.name,
      sortOrder: r.sort_order,
    }))
  },
  ["judging-venues"],
  { tags: [CACHE_TAGS.judging] },
)

export const getJudgingAssignments = unstable_cache(
  async (adminUserId: string): Promise<JudgingAssignment[]> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("admin_list_judging_assignments", { p_admin_user_id: adminUserId })
    return (
      (data ?? []) as {
        kind: VenueKind
        scope: JudgingScope
        ref_id: string
        judging_venue_id: string
      }[]
    ).map((r) => ({
      kind: r.kind ?? "judging",
      scope: r.scope,
      refId: r.ref_id,
      venueId: r.judging_venue_id,
    }))
  },
  ["judging-assignments"],
  { tags: [CACHE_TAGS.judging] },
)

export async function getJudgingSettings(adminUserId: string): Promise<JudgingSettings> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_get_judging_settings", { p_admin_user_id: adminUserId })
  const row = (Array.isArray(data) ? data[0] : data) as
    | { report_heading: string; rubric: RubricRow[]; faculty_heading?: string; faculty_timing?: string }
    | null
  return {
    reportHeading: row?.report_heading ?? "EnVision 2026 - Judging Sheet",
    rubric: Array.isArray(row?.rubric) && row.rubric.length > 0 ? row.rubric : DEFAULT_RUBRIC,
    facultyHeading: row?.faculty_heading ?? "EnVision 2026 - Faculty Schedule",
    facultyTiming: row?.faculty_timing ?? "2:00 PM - 4:00 PM",
  }
}

/**
 * Rubric + heading for the student/mentor Guidelines page — no admin
 * required (the RPC is granted to anon). Returns null if the criteria
 * haven't been set up.
 */
export const getPublicJudgingRubric = unstable_cache(
  async (): Promise<{ heading: string; rubric: RubricRow[] } | null> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("get_judging_rubric")
    const row = (Array.isArray(data) ? data[0] : data) as
      | { report_heading: string; rubric: RubricRow[] }
      | null
    if (!row || !Array.isArray(row.rubric) || row.rubric.length === 0) return null
    return { heading: row.report_heading ?? "Judging Sheet", rubric: row.rubric }
  },
  ["judging-rubric"],
  { tags: [CACHE_TAGS.judging] },
)

/**
 * A team's presentation venue is layered: its own assignment wins, then its
 * mentor's, then its theme's. Returns the resolving level too so the UI can
 * show where the value came from.
 */
export function resolveJudgingVenue(
  assignments: JudgingAssignment[],
  team: { studentUserId: string; mentorUserId: string | null; domainId: string | null },
  kind: VenueKind = "judging",
): { venueId: string | null; source: JudgingScope | null } {
  const byKey = new Map(
    assignments.filter((a) => a.kind === kind).map((a) => [`${a.scope}:${a.refId}`, a.venueId]),
  )
  const team_ = byKey.get(`team:${team.studentUserId}`)
  if (team_) return { venueId: team_, source: "team" }
  if (team.mentorUserId) {
    const m = byKey.get(`mentor:${team.mentorUserId}`)
    if (m) return { venueId: m, source: "mentor" }
  }
  if (team.domainId) {
    const t = byKey.get(`theme:${team.domainId}`)
    if (t) return { venueId: t, source: "theme" }
  }
  return { venueId: null, source: null }
}
