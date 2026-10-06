import { getSupabaseServerClient } from "@/lib/supabase-server"
import { teamLogoUrl } from "@/lib/image-url"
import { effectiveTiebreak } from "@/lib/tiebreak"
import { rankTeams } from "@/lib/leaderboard-rank"

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
 * by them under the rule in lib/leaderboard-rank.ts (one round: its total;
 * two or more: the average, a missing round counting as 0; ties broken by
 * each round's criteria order). Never cached —
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

  const teams = (raw.teams ?? []).map((t) => {
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
    }
  })

  const entries: LeaderboardEntry[] = rankTeams(rounds, teams)
  return { rounds, entries }
}
