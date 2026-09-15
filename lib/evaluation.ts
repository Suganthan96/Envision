import { unstable_cache } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { CACHE_TAGS } from "@/lib/cache-tags"
import type { RubricRow } from "@/lib/judging"

/**
 * An evaluation round. Exactly one preset is active at a time; the active
 * one is the rubric students see, the one the judging PDFs print, and the
 * one every faculty member and juror marks against.
 */
export interface RubricPreset {
  id: string
  name: string
  rubric: RubricRow[]
  isActive: boolean
  sortOrder: number
  /** Sheets already filed against this round — a delete would take them too. */
  evaluationCount: number
}

/** One team as it appears in an evaluator's own list, with their own marks. */
export interface EvaluatorTeam {
  studentUserId: string
  loginId: string
  teamName: string | null
  projectTitle: string | null
  domainId: string | null
  mentorName: string | null
  venueName: string | null
  /** Added to this evaluator by the admin rather than inherited from a room. */
  isExtra: boolean
  marks: Record<string, number>
  total: number | null
}

/** One evaluator's sheet for one team, as the admin sees it. */
export interface EvaluationRow {
  presetId: string
  studentUserId: string
  evaluatorUserId: string
  evaluatorLoginId: string
  evaluatorName: string | null
  evaluatorRole: "faculty" | "jury"
  marks: Record<string, number>
  total: number
  updatedAt: string
}

/** A faculty or jury account, with the scope the admin has given it. */
export interface Evaluator {
  userId: string
  loginId: string
  name: string | null
  role: "faculty" | "jury"
  venueIds: string[]
  /** Individual teams added on top of the venues. */
  teamIds: string[]
  /** Teams this evaluator has filed marks for in the active round. */
  evaluatedCount: number
}

const marksOf = (v: unknown): Record<string, number> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {}
  const out: Record<string, number> = {}
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    const n = Number(raw)
    if (Number.isFinite(n)) out[k] = n
  }
  return out
}

export async function getRubricPresets(adminUserId: string): Promise<RubricPreset[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_rubric_presets", { p_admin_user_id: adminUserId })
  return ((data ?? []) as {
    id: string
    name: string
    rubric: RubricRow[]
    is_active: boolean
    sort_order: number
    evaluation_count: number
  }[]).map((r) => ({
    id: r.id,
    name: r.name,
    rubric: Array.isArray(r.rubric) ? r.rubric : [],
    isActive: r.is_active,
    sortOrder: r.sort_order,
    evaluationCount: Number(r.evaluation_count ?? 0),
  }))
}

/**
 * The active round's rubric, for anyone who isn't an admin — students on
 * Guidelines and evaluators on /evaluate. Cached under the presets tag, so
 * activating a different round takes effect immediately everywhere.
 */
export const getActiveRubric = unstable_cache(
  async (): Promise<{ presetId: string; presetName: string; rubric: RubricRow[] } | null> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("get_active_rubric")
    const row = (Array.isArray(data) ? data[0] : data) as
      | { preset_id: string; preset_name: string; rubric: RubricRow[] }
      | null
    if (!row || !Array.isArray(row.rubric) || row.rubric.length === 0) return null
    return { presetId: row.preset_id, presetName: row.preset_name, rubric: row.rubric }
  },
  ["active-rubric"],
  { tags: [CACHE_TAGS.rubricPresets, CACHE_TAGS.judging] },
)

/** The teams one evaluator may mark. Never cached — it is per-account. */
export async function getEvaluatorTeams(userId: string): Promise<EvaluatorTeam[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("evaluator_list_teams", { p_user_id: userId })
  return ((data ?? []) as {
    student_user_id: string
    login_id: string
    team_name: string | null
    project_title: string | null
    domain_id: string | null
    mentor_name: string | null
    venue_name: string | null
    is_extra: boolean
    marks: unknown
    total: number | null
  }[]).map((r) => ({
    studentUserId: r.student_user_id,
    loginId: r.login_id,
    teamName: r.team_name,
    projectTitle: r.project_title,
    domainId: r.domain_id,
    mentorName: r.mentor_name,
    venueName: r.venue_name,
    isExtra: Boolean(r.is_extra),
    marks: marksOf(r.marks),
    total: r.total == null ? null : Number(r.total),
  }))
}

export async function getEvaluators(adminUserId: string): Promise<Evaluator[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_evaluators", { p_admin_user_id: adminUserId })
  return ((data ?? []) as {
    user_id: string
    login_id: string
    name: string | null
    role: "faculty" | "jury"
    venue_ids: string[] | null
    team_ids: string[] | null
    evaluated_count: number
  }[]).map((r) => ({
    userId: r.user_id,
    loginId: r.login_id,
    name: r.name,
    role: r.role,
    venueIds: r.venue_ids ?? [],
    teamIds: r.team_ids ?? [],
    evaluatedCount: Number(r.evaluated_count ?? 0),
  }))
}

/** Every evaluator's sheet for one round (the active one when presetId is null). */
export async function getEvaluations(
  adminUserId: string,
  presetId: string | null = null,
): Promise<EvaluationRow[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_evaluations", {
    p_admin_user_id: adminUserId,
    p_preset_id: presetId,
  })
  return ((data ?? []) as {
    preset_id: string
    student_user_id: string
    evaluator_user_id: string
    evaluator_login_id: string
    evaluator_name: string | null
    evaluator_role: "faculty" | "jury"
    marks: unknown
    total: number
    updated_at: string
  }[]).map((r) => ({
    presetId: r.preset_id,
    studentUserId: r.student_user_id,
    evaluatorUserId: r.evaluator_user_id,
    evaluatorLoginId: r.evaluator_login_id,
    evaluatorName: r.evaluator_name,
    evaluatorRole: r.evaluator_role,
    marks: marksOf(r.marks),
    total: Number(r.total),
    updatedAt: r.updated_at,
  }))
}

/**
 * Per-criterion average across every sheet filed for a team, plus the average
 * total. A criterion only averages the evaluators who actually marked it, so
 * one evaluator skipping a row doesn't drag it down.
 */
export function averageMarks(rows: { marks: Record<string, number> }[], rubric: RubricRow[]) {
  const perCriterion: Record<string, number | null> = {}
  for (const criterion of rubric) {
    const values = rows
      .map((r) => r.marks[criterion.label])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    perCriterion[criterion.label] =
      values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length
  }
  const totals = rows.map((r) => Object.values(r.marks).reduce((a, b) => a + b, 0))
  const average = totals.length === 0 ? null : totals.reduce((a, b) => a + b, 0) / totals.length
  return { perCriterion, average, count: rows.length }
}
