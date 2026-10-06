import { getSupabaseServerClient } from "@/lib/supabase-server"
import { teamLogoUrl } from "@/lib/image-url"
import { compareByTiebreak, effectiveTiebreak } from "@/lib/tiebreak"

export interface LeaderboardRound {
  id: string
  name: string
  /** Marks available in the round — the "/ 50" beside a score. */
  max: number
  /** Criteria in the order that breaks ties within this round. */
  tiebreak: string[]
}

export interface LeaderboardEntry {
  studentUserId: string
  loginId: string
  teamName: string
  teamLogoUrl: string | null
  projectTitle: string | null
  domainId: string | null
  mentorName: string | null
  mentorUserId: string | null
  /** Total per published round, keyed by round id. Absent = not scored. */
  scores: Record<string, number>
  /** The single round's total, or the average across all published rounds. */
  overall: number
  rank: number
}

/**
 * The rounds an admin has published from /admin/judging/scores, and every team ranked
 * by them. With one round the ranking is that round's total; with two or more
 * it is the average across them, a round a team has no score in counting as 0
 * so skipping a round never lifts a team. Equal scores are separated by each
 * round's tie-break order (lib/tiebreak.ts), round by round; teams equal on
 * every criterion share a rank. Never cached —
 * publishing a round or editing a mark should show up on the next load.
 */
export async function getLeaderboard(
  userId: string,
): Promise<{ rounds: LeaderboardRound[]; entries: LeaderboardEntry[] }> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_leaderboard", { p_user_id: userId })
  const raw = (data ?? {}) as {
    rounds?: { id: string; name: string; max: number | string; criteria?: string[]; tiebreak?: string[] }[]
    teams?: {
      id: string
      loginId: string
      name: string | null
      logoVersion: string | null
      projectTitle: string | null
      domainId: string | null
      mentorName: string | null
      mentorUserId: string | null
      scores: Record<string, number | string>
      marks?: Record<string, Record<string, number | string>>
    }[]
  }

  const rounds: LeaderboardRound[] = (raw.rounds ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    max: Number(r.max) || 0,
    tiebreak: effectiveTiebreak(r.criteria ?? [], r.tiebreak),
  }))
  if (rounds.length === 0) return { rounds, entries: [] }

  const scored = (raw.teams ?? []).map((t) => {
    const scores: Record<string, number> = {}
    for (const [id, v] of Object.entries(t.scores ?? {})) {
      const n = Number(v)
      if (Number.isFinite(n)) scores[id] = n
    }
    const marks: Record<string, Record<string, number>> = {}
    for (const [id, m] of Object.entries(t.marks ?? {})) {
      marks[id] = Object.fromEntries(
        Object.entries(m ?? {})
          .map(([k, v]) => [k, Number(v)] as const)
          .filter(([, v]) => Number.isFinite(v)),
      )
    }
    const sum = rounds.reduce((acc, r) => acc + (scores[r.id] ?? 0), 0)
    return {
      marks,
      studentUserId: t.id,
      loginId: t.loginId,
      teamName: t.name?.trim() || t.loginId,
      teamLogoUrl: teamLogoUrl(t.loginId, t.logoVersion),
      projectTitle: t.projectTitle?.trim() || null,
      domainId: t.domainId,
      mentorName: t.mentorName,
      mentorUserId: t.mentorUserId,
      scores,
      overall: Math.round((sum / rounds.length) * 100) / 100,
    }
  })

  // Equal totals are separated round by round, each by its own criteria order.
  const tiebreak = (a: (typeof scored)[number], b: (typeof scored)[number]) => {
    for (const r of rounds) {
      const diff = compareByTiebreak(r.tiebreak, a.marks[r.id], b.marks[r.id])
      if (diff !== 0) return diff
    }
    return 0
  }

  // Teams with no score in any published round have nothing to rank on.
  const ranked = scored
    .filter((t) => rounds.some((r) => t.scores[r.id] != null))
    .sort(
      (a, b) =>
        b.overall - a.overall ||
        tiebreak(a, b) ||
        Number(a.loginId) - Number(b.loginId) ||
        a.loginId.localeCompare(b.loginId),
    )

  const entries: LeaderboardEntry[] = []
  ranked.forEach(({ marks: _marks, ...t }, i) => {
    const prev = ranked[i - 1]
    const tied = prev && prev.overall === t.overall && tiebreak(prev, ranked[i]) === 0
    entries.push({ ...t, rank: tied ? entries[i - 1].rank : i + 1 })
  })
  return { rounds, entries }
}
