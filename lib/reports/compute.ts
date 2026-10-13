import { rankTeams } from "@/lib/leaderboard-rank"
import { effectiveTiebreak } from "@/lib/tiebreak"
import type { ReportData, ReportRound, ReportTeam } from "@/lib/reports/types"

/**
 * The numbers behind every report, computed once from ReportData so the PDFs
 * and spreadsheets always agree with each other and with the website (the
 * rankings use the same rule as the leaderboard, lib/leaderboard-rank.ts).
 */

const round2 = (n: number) => Math.round(n * 100) / 100

export function summarize(values: number[]) {
  if (values.length === 0) return { count: 0, mean: null, median: null, min: null, max: null, sd: null }
  const sorted = [...values].sort((a, b) => a - b)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length)
  return {
    count: values.length,
    mean: round2(mean),
    median: round2(median),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    sd: round2(sd),
  }
}

const totalOf = (marks: Record<string, number> | undefined) =>
  marks && Object.keys(marks).length ? round2(Object.values(marks).reduce((a, b) => a + b, 0)) : null

/* ------------------------------------------------------------- rounds -- */

export interface RoundResultRow {
  team: ReportTeam
  marks: Record<string, number>
  total: number | null
  rank: number | null
  sheets: number
}

/** Every team's result in one round, ranked with the round's tie-break. */
export function roundResults(round: ReportRound, teams: ReportTeam[]): RoundResultRow[] {
  const ranked = rankTeams(
    [{ id: round.id, tiebreak: effectiveTiebreak(round.criteria.map((c) => c.label), round.tiebreak) }],
    teams.map((t) => {
      const m = round.marks[t.studentUserId]
      const total = totalOf(m)
      return {
        loginId: t.loginId,
        studentUserId: t.studentUserId,
        scores: total == null ? {} : { [round.id]: total },
        marks: m ? { [round.id]: m } : {},
      }
    }),
  )
  const rankOf = new Map(ranked.map((r) => [r.studentUserId, r.rank]))
  const sheetCount = new Map<string, number>()
  for (const s of round.sheets) sheetCount.set(s.studentUserId, (sheetCount.get(s.studentUserId) ?? 0) + 1)

  return teams
    .map((t) => ({
      team: t,
      marks: round.marks[t.studentUserId] ?? {},
      total: totalOf(round.marks[t.studentUserId]),
      rank: rankOf.get(t.studentUserId) ?? null,
      sheets: sheetCount.get(t.studentUserId) ?? 0,
    }))
    .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || Number(a.team.loginId) - Number(b.team.loginId))
}

export function roundStats(round: ReportRound, teams: ReportTeam[]) {
  const rows = roundResults(round, teams)
  const totals = rows.map((r) => r.total).filter((t): t is number => t != null)
  const criteria = round.criteria.map((c) => {
    const vals = rows.map((r) => r.marks[c.label]).filter((v): v is number => typeof v === "number")
    const s = summarize(vals)
    // `outOf` is the criterion's maximum mark; `max` (from summarize) is the
    // highest mark actually given.
    return { label: c.label, outOf: c.max, ...s, percent: s.mean == null || !c.max ? null : Math.round((s.mean / c.max) * 100) }
  })
  // Five-mark bands, 0–5, 5–10, … up to the round's maximum.
  const step = round.max > 60 ? 10 : 5
  const bands: { label: string; from: number; to: number; count: number }[] = []
  for (let from = 0; from < Math.max(round.max, step); from += step) {
    const to = Math.min(from + step, round.max || from + step)
    bands.push({ label: `${from}–${to}`, from, to, count: 0 })
  }
  for (const t of totals) {
    const i = Math.min(bands.length - 1, Math.floor(t / step))
    if (bands[i]) bands[i].count += 1
  }
  const evaluators = new Set(round.sheets.map((s) => s.evaluatorLoginId))
  return {
    round,
    rows,
    scored: totals.length,
    unscored: teams.length - totals.length,
    totals: summarize(totals),
    criteria,
    bands,
    sheets: round.sheets.length,
    evaluators: evaluators.size,
  }
}

/** Ranking by one round's total or the average of several, like the leaderboard. */
export function leaderboard(rounds: ReportRound[], teams: ReportTeam[]) {
  const ranked = rankTeams(
    rounds.map((r) => ({ id: r.id, tiebreak: effectiveTiebreak(r.criteria.map((c) => c.label), r.tiebreak) })),
    teams.map((t) => {
      const scores: Record<string, number> = {}
      const marks: Record<string, Record<string, number>> = {}
      for (const r of rounds) {
        const m = r.marks[t.studentUserId]
        const total = totalOf(m)
        if (total != null && m) {
          scores[r.id] = total
          marks[r.id] = m
        }
      }
      return { loginId: t.loginId, team: t, scores, marks }
    }),
  )
  const max = rounds.length ? rounds.reduce((s, r) => s + r.max, 0) / rounds.length : 0
  return { rows: ranked, max }
}

/** The rounds the public leaderboard uses (published), else the live one. */
export function defaultLeaderboardRounds(data: ReportData) {
  const published = data.rounds.filter((r) => r.published)
  return published.length ? published : data.rounds.filter((r) => r.live)
}

/* ---------------------------------------------------------- programme -- */

export function programmeStats(data: ReportData) {
  const teams = data.teams
  const students = teams.flatMap((t) => t.members.map((m) => ({ ...m, team: t })))

  const deptCount = new Map<string, number>()
  for (const s of students) {
    const d = s.department?.trim() || "Not given"
    deptCount.set(d, (deptCount.get(d) ?? 0) + 1)
  }
  const departments = [...deptCount]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (a.name === "Not given" ? 1 : b.name === "Not given" ? -1 : b.count - a.count))

  const sizeCount = new Map<number, number>()
  for (const t of teams) sizeCount.set(t.members.length, (sizeCount.get(t.members.length) ?? 0) + 1)
  const teamSizes = [...sizeCount].map(([size, count]) => ({ size, count })).sort((a, b) => a.size - b.size)

  const themes = data.domains.map((d) => ({
    ...d,
    teams: teams.filter((t) => t.domainId === d.id).length,
    mentors: data.mentors.filter((m) => m.domainIds.includes(d.id)).length,
  }))

  const mentorLoad = [0, 1, 2].map((n) => ({
    teams: n,
    mentors: data.mentors.filter((m) => Math.min(m.teamLoginIds.length, 2) === n).length,
  }))

  const roleCount = new Map<string, number>()
  for (const a of data.accounts.filter((a) => !a.hidden)) roleCount.set(a.role, (roleCount.get(a.role) ?? 0) + 1)

  return {
    teams: teams.length,
    students: students.length,
    departments,
    teamSizes,
    themes,
    noTheme: teams.filter((t) => !t.domainId).length,
    mentors: data.mentors.length,
    mentorsGuiding: data.mentors.filter((m) => m.teamLoginIds.length > 0).length,
    mentorLoad,
    teamsWithMentor: teams.filter((t) => t.mentorUserId).length,
    evaluators: data.evaluators.length,
    faculty: data.evaluators.filter((e) => e.role === "faculty").length,
    jury: data.evaluators.filter((e) => e.role === "jury").length,
    submitted: teams.filter((t) => t.driveUrl || t.canvaUrl).length,
    withProjectTitle: teams.filter((t) => t.projectTitle?.trim()).length,
    withProblem: teams.filter((t) => t.problemStatement?.trim()).length,
    withSolution: teams.filter((t) => t.solutionShort?.trim() || t.solutionLong?.trim()).length,
    withJudgingRoom: teams.filter((t) => t.judgingVenue).length,
    startingPassword: data.accounts.filter((a) => !a.hidden && (a.role === "member" || a.role === "mentor") && a.mustChangePassword).length,
    roles: Object.fromEntries(roleCount),
    rounds: data.rounds.map((r) => roundStats(r, teams)),
  }
}

/* --------------------------------------------------------------- team -- */

/** One team's results in every round, with its rank in each and overall. */
export function teamResults(data: ReportData, team: ReportTeam) {
  const perRound = data.rounds.map((round) => {
    const rows = roundResults(round, data.teams)
    const mine = rows.find((r) => r.team.studentUserId === team.studentUserId)!
    const sheets = round.sheets.filter((s) => s.studentUserId === team.studentUserId)
    return {
      round,
      marks: mine.marks,
      total: mine.total,
      rank: mine.rank,
      outOf: rows.filter((r) => r.rank != null).length,
      sheets,
    }
  })
  const boardRounds = defaultLeaderboardRounds(data)
  const board = boardRounds.length ? leaderboard(boardRounds, data.teams) : null
  const entry = board?.rows.find((r) => r.team.studentUserId === team.studentUserId) ?? null
  return {
    perRound,
    overall: entry
      ? { rank: entry.rank, of: board!.rows.length, score: entry.overall, max: board!.max, rounds: boardRounds.map((r) => r.name) }
      : null,
  }
}
