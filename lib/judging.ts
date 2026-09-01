import { getSupabaseServerClient } from "@/lib/supabase-server"

export interface JudgingVenue {
  id: string
  name: string
  sortOrder: number
}

export type JudgingScope = "team" | "mentor" | "theme"

export interface JudgingAssignment {
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
}

export const DEFAULT_RUBRIC: RubricRow[] = [
  { label: "Background Study", max: 10 },
  { label: "Problem Statement", max: 15 },
  { label: "User Identification", max: 10 },
  { label: "Solution", max: 5 },
  { label: "Team work and presentation", max: 10 },
]

export async function getJudgingVenues(adminUserId: string): Promise<JudgingVenue[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_judging_venues", { p_admin_user_id: adminUserId })
  return ((data ?? []) as { id: string; name: string; sort_order: number }[]).map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order,
  }))
}

export async function getJudgingAssignments(adminUserId: string): Promise<JudgingAssignment[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_judging_assignments", { p_admin_user_id: adminUserId })
  return ((data ?? []) as { scope: JudgingScope; ref_id: string; judging_venue_id: string }[]).map((r) => ({
    scope: r.scope,
    refId: r.ref_id,
    venueId: r.judging_venue_id,
  }))
}

export async function getJudgingSettings(adminUserId: string): Promise<JudgingSettings> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_get_judging_settings", { p_admin_user_id: adminUserId })
  const row = (Array.isArray(data) ? data[0] : data) as
    | { report_heading: string; rubric: RubricRow[] }
    | null
  return {
    reportHeading: row?.report_heading ?? "EnVision 2026 - Judging Sheet",
    rubric: Array.isArray(row?.rubric) && row.rubric.length > 0 ? row.rubric : DEFAULT_RUBRIC,
  }
}

/**
 * A team's presentation venue is layered: its own assignment wins, then its
 * mentor's, then its theme's. Returns the resolving level too so the UI can
 * show where the value came from.
 */
export function resolveJudgingVenue(
  assignments: JudgingAssignment[],
  team: { studentUserId: string; mentorUserId: string | null; domainId: string | null },
): { venueId: string | null; source: JudgingScope | null } {
  const byKey = new Map(assignments.map((a) => [`${a.scope}:${a.refId}`, a.venueId]))
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
