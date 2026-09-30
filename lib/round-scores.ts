import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * Admin-entered judging marks are kept per round (rubric preset), so starting
 * a new round never touches the marks of the last one. Never cached — the
 * Scores page is edited live and refreshes itself.
 */
export interface RoundScoreSummary {
  presetId: string
  scoredCount: number
  averageTotal: number | null
  topTotal: number | null
  updatedAt: string | null
}

export async function getRoundScoreSummaries(adminUserId: string): Promise<RoundScoreSummary[]> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_round_score_summaries", {
    p_admin_user_id: adminUserId,
  })
  return ((data ?? []) as {
    preset_id: string
    scored_count: number
    average_total: number | string | null
    top_total: number | string | null
    updated_at: string | null
  }[]).map((r) => ({
    presetId: r.preset_id,
    scoredCount: Number(r.scored_count ?? 0),
    averageTotal: r.average_total == null ? null : Number(r.average_total),
    topTotal: r.top_total == null ? null : Number(r.top_total),
    updatedAt: r.updated_at,
  }))
}

/** Per-criterion marks for every team scored in one round, keyed by team. */
export async function getRoundScores(
  adminUserId: string,
  presetId: string,
): Promise<Record<string, Record<string, number>>> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("admin_list_round_scores", {
    p_admin_user_id: adminUserId,
    p_preset_id: presetId,
  })
  const out: Record<string, Record<string, number>> = {}
  for (const r of (data ?? []) as { student_user_id: string; marks: unknown }[]) {
    const marks: Record<string, number> = {}
    if (r.marks && typeof r.marks === "object" && !Array.isArray(r.marks)) {
      for (const [k, v] of Object.entries(r.marks as Record<string, unknown>)) {
        const n = Number(v)
        if (Number.isFinite(n)) marks[k] = n
      }
    }
    out[r.student_user_id] = marks
  }
  return out
}
