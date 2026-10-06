import { compareByTiebreak } from "@/lib/tiebreak"

/**
 * The one ranking rule, shared by the real leaderboard (lib/leaderboard.ts)
 * and the admin home's round picker, so a preview always matches what teams
 * will see. Pure and dependency-free so it also runs in the browser.
 *
 * With one round the ranking is that round's total; with two or more it is
 * the average across them, a round a team has no score in counting as 0 so
 * skipping a round never lifts a team. Equal scores are separated by each
 * round's tie-break order, round by round; teams equal on every criterion
 * share a rank. Teams with no score in any of the rounds are left out.
 */
export interface RankRound {
  id: string
  /** Criteria in the order that breaks ties within this round. */
  tiebreak: string[]
}

export interface RankInput {
  loginId: string
  /** Total per round, keyed by round id. Absent = not scored. */
  scores: Record<string, number>
  /** Per-criterion marks per round, keyed by round id. */
  marks: Record<string, Record<string, number>>
}

export function rankTeams<T extends RankInput>(
  rounds: RankRound[],
  teams: T[],
): (Omit<T, "marks"> & { overall: number; rank: number })[] {
  if (rounds.length === 0) return []

  const scored = teams
    .filter((t) => rounds.some((r) => t.scores[r.id] != null))
    .map((t) => {
      const sum = rounds.reduce((acc, r) => acc + (t.scores[r.id] ?? 0), 0)
      return { team: t, overall: Math.round((sum / rounds.length) * 100) / 100 }
    })

  const tiebreak = (a: T, b: T) => {
    for (const r of rounds) {
      const diff = compareByTiebreak(r.tiebreak, a.marks[r.id], b.marks[r.id])
      if (diff !== 0) return diff
    }
    return 0
  }

  scored.sort(
    (a, b) =>
      b.overall - a.overall ||
      tiebreak(a.team, b.team) ||
      Number(a.team.loginId) - Number(b.team.loginId) ||
      a.team.loginId.localeCompare(b.team.loginId),
  )

  const out: (Omit<T, "marks"> & { overall: number; rank: number })[] = []
  scored.forEach(({ team, overall }, i) => {
    const prev = scored[i - 1]
    const tied = prev && prev.overall === overall && tiebreak(prev.team, team) === 0
    const { marks: _marks, ...rest } = team
    out.push({ ...rest, overall, rank: tied ? out[i - 1].rank : i + 1 })
  })
  return out
}
