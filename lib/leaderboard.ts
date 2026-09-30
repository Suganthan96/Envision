import { getSupabaseServerClient } from "@/lib/supabase-server"

export interface LeaderboardRound {
  id: string
  name: string
  /** Marks available in the round — the "/ 50" beside a score. */
  max: number
}

export interface LeaderboardEntry {
  studentUserId: string
  loginId: string
  teamName: string
  /** Total per published round, keyed by round id. Absent = not scored. */
  scores: Record<string, number>
  /** The single round's total, or the average across all published rounds. */
  overall: number
  rank: number
}

/**
 * The rounds an admin has published from /admin/scores, and every team ranked
 * by them. With one round the ranking is that round's total; with two or more
 * it is the average across them, a round a team has no score in counting as 0
 * so skipping a round never lifts a team. Ties share a rank. Never cached —
 * publishing a round or editing a mark should show up on the next load.
 */
export async function getLeaderboard(
  userId: string,
): Promise<{ rounds: LeaderboardRound[]; entries: LeaderboardEntry[] }> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_leaderboard", { p_user_id: userId })
  const raw = (data ?? {}) as {
    rounds?: { id: string; name: string; max: number | string }[]
    teams?: { id: string; loginId: string; name: string | null; scores: Record<string, number | string> }[]
  }

  const rounds: LeaderboardRound[] = (raw.rounds ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    max: Number(r.max) || 0,
  }))
  if (rounds.length === 0) return { rounds, entries: [] }

  const scored = (raw.teams ?? []).map((t) => {
    const scores: Record<string, number> = {}
    for (const [id, v] of Object.entries(t.scores ?? {})) {
      const n = Number(v)
      if (Number.isFinite(n)) scores[id] = n
    }
    const sum = rounds.reduce((acc, r) => acc + (scores[r.id] ?? 0), 0)
    return {
      studentUserId: t.id,
      loginId: t.loginId,
      teamName: t.name?.trim() || t.loginId,
      scores,
      overall: Math.round((sum / rounds.length) * 100) / 100,
    }
  })

  // Teams with no score in any published round have nothing to rank on.
  const ranked = scored
    .filter((t) => rounds.some((r) => t.scores[r.id] != null))
    .sort(
      (a, b) =>
        b.overall - a.overall || Number(a.loginId) - Number(b.loginId) || a.loginId.localeCompare(b.loginId),
    )

  const entries: LeaderboardEntry[] = []
  ranked.forEach((t, i) => {
    const prev = entries[i - 1]
    entries.push({ ...t, rank: prev && prev.overall === t.overall ? prev.rank : i + 1 })
  })
  return { rounds, entries }
}
