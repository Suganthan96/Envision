import type { ReportData, ReportRound } from "@/lib/reports/types"
import { leaderboard, programmeStats, roundResults } from "@/lib/reports/compute"
import { when } from "@/lib/reports/format"

/**
 * The spreadsheet reports. Each builder returns sheets; `downloadWorkbook`
 * turns them into one .xlsx in the browser (SheetJS is loaded only then).
 * The "Everything" workbook is simply all of them together.
 */

type Cell = string | number | null
export interface Sheet {
  name: string
  rows: Cell[][]
  /** Column widths in characters. */
  widths?: number[]
}

const yes = (b: boolean) => (b ? "Yes" : "No")
const dash = (s: string | null | undefined) => (s && String(s).trim()) || ""

export async function downloadWorkbook(filename: string, sheets: Sheet[]) {
  const XLSX = await import("xlsx")
  const wb = XLSX.utils.book_new()
  const used = new Set<string>()
  for (const s of sheets) {
    // Sheet names: max 31 chars, unique, no []:*?/\
    let name = s.name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31)
    let n = 2
    while (used.has(name)) name = `${s.name.slice(0, 28)} ${n++}`
    used.add(name)
    const ws = XLSX.utils.aoa_to_sheet(s.rows)
    if (s.widths) ws["!cols"] = s.widths.map((wch) => ({ wch }))
    if (s.rows.length > 1) ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: s.rows.length - 1, c: (s.rows[0]?.length ?? 1) - 1 } }) }
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  XLSX.writeFile(wb, filename)
}

export const fileStem = (data: ReportData, what: string) => `EnVision ${data.year.id} - ${what}`

/* ------------------------------------------------------------- sheets -- */

export function statisticsSheets(data: ReportData): Sheet[] {
  const s = programmeStats(data)
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "")
  const summary: Cell[][] = [
    ["Measure", "Value", "Share"],
    ["Programme year", data.year.label, ""],
    ["Teams", s.teams, ""],
    ["Students", s.students, ""],
    ["Average team size", s.teams ? Math.round((s.students / s.teams) * 10) / 10 : "", ""],
    ["Mentors", s.mentors, ""],
    ["Mentors guiding a team", s.mentorsGuiding, pct(s.mentorsGuiding, s.mentors)],
    ["Teams with a mentor", s.teamsWithMentor, pct(s.teamsWithMentor, s.teams)],
    ["Teams with a theme", s.teams - s.noTheme, pct(s.teams - s.noTheme, s.teams)],
    ["Teams with a project title", s.withProjectTitle, pct(s.withProjectTitle, s.teams)],
    ["Teams with a problem statement", s.withProblem, pct(s.withProblem, s.teams)],
    ["Teams with a solution", s.withSolution, pct(s.withSolution, s.teams)],
    ["Decks submitted", s.submitted, pct(s.submitted, s.teams)],
    ["Teams with a judging room", s.withJudgingRoom, pct(s.withJudgingRoom, s.teams)],
    ["Evaluators", s.evaluators, ""],
    ["  Faculty", s.faculty, ""],
    ["  External jury", s.jury, ""],
    ["Team and mentor accounts on the starting password", s.startingPassword, ""],
    ["Judging rounds", data.rounds.length, ""],
    ["Report generated", when(data.generatedAt), ""],
  ]
  const departments: Cell[][] = [["Department", "Students", "Share"], ...s.departments.map((d) => [d.name, d.count, pct(d.count, s.students)])]
  const sizes: Cell[][] = [["Team size", "Teams"], ...s.teamSizes.map((t) => [t.size, t.count])]
  const themes: Cell[][] = [
    ["Theme", "SDGs", "Teams", "Team capacity", "Mentors", "Mentor capacity"],
    ...s.themes.map((t) => [t.title, t.sdgs.join(", "), t.teams, t.teamCapacity, t.mentors, t.mentorCapacity]),
  ]
  const load: Cell[][] = [["Teams guided", "Mentors"], ...s.mentorLoad.map((m) => [m.teams, m.mentors])]
  const rounds: Cell[][] = [
    ["Round", "Live", "On leaderboard", "Out of", "Teams scored", "Not scored", "Average", "Median", "Lowest", "Highest", "Std dev", "Evaluator sheets", "Evaluators"],
    ...s.rounds.map((r) => [
      r.round.name, yes(r.round.live), yes(r.round.published), r.round.max, r.scored, r.unscored,
      r.totals.mean, r.totals.median, r.totals.min, r.totals.max, r.totals.sd, r.sheets, r.evaluators,
    ]),
  ]
  const criteria: Cell[][] = [
    ["Round", "Criterion", "Out of", "Average", "Average %", "Median", "Lowest", "Highest"],
    ...s.rounds.flatMap((r) =>
      r.criteria.map((c) => [r.round.name, c.label, c.outOf, c.mean, c.percent == null ? "" : `${c.percent}%`, c.median, c.min, c.max]),
    ),
  ]
  const dist: Cell[][] = [["Round", "Score band", "Teams"], ...s.rounds.flatMap((r) => r.bands.map((b) => [r.round.name, b.label, b.count]))]
  return [
    { name: "Summary", rows: summary, widths: [48, 16, 10] },
    { name: "Departments", rows: departments, widths: [20, 10, 10] },
    { name: "Team sizes", rows: sizes, widths: [12, 10] },
    { name: "Themes", rows: themes, widths: [50, 22, 8, 14, 9, 16] },
    { name: "Mentor load", rows: load, widths: [14, 10] },
    { name: "Rounds", rows: rounds, widths: [26, 6, 15, 8, 13, 11, 9, 9, 8, 9, 8, 16, 11] },
    { name: "Criteria", rows: criteria, widths: [26, 30, 6, 9, 11, 9, 8, 9] },
    { name: "Score distribution", rows: dist, widths: [26, 12, 8] },
  ]
}

export function teamSheets(data: ReportData): Sheet[] {
  const ranked = data.rounds.map((r) => new Map(roundResults(r, data.teams).map((x) => [x.team.studentUserId, x])))
  const head = [
    "Team #", "Team name", "Team lead", "Lead email", "Phone", "Members", "Theme", "Mentor", "Mentor reg. no.",
    "Lab venue", "Judging room", "Waiting room", "Project title", "Problem statement", "Solution (short)", "Solution (detail)",
    "Deck (Drive)", "Canva", "Deck updated", ...data.rounds.flatMap((r) => [`${r.name} score`, `${r.name} rank`]),
  ]
  const rows: Cell[][] = [
    head,
    ...data.teams.map((t) => [
      t.loginId, t.teamName, dash(t.teamLeadName), dash(t.email), dash(t.phone), t.members.length, dash(t.domainTitle),
      dash(t.mentorName), dash(t.mentorLoginId), dash(t.labVenue), dash(t.judgingVenue), dash(t.waitingVenue),
      dash(t.projectTitle), dash(t.problemStatement), dash(t.solutionShort), dash(t.solutionLong),
      dash(t.driveUrl), dash(t.canvaUrl), when(t.submittedAt),
      ...ranked.flatMap((m) => {
        const x = m.get(t.studentUserId)
        return [x?.total ?? "", x?.rank ?? ""]
      }),
    ]),
  ]
  return [{ name: "Teams", rows, widths: [7, 24, 20, 26, 13, 8, 34, 20, 15, 9, 12, 12, 30, 40, 40, 40, 40, 30, 18, ...data.rounds.flatMap(() => [10, 8])] }]
}

export function studentSheets(data: ReportData): Sheet[] {
  const rows: Cell[][] = [
    ["Student", "Email", "Department", "Team #", "Team name", "Theme", "Mentor"],
    ...data.teams.flatMap((t) =>
      t.members.map((m) => [m.name, dash(m.email), dash(m.department), t.loginId, t.teamName, dash(t.domainTitle), dash(t.mentorName)]),
    ),
  ]
  return [{ name: "Students", rows, widths: [26, 30, 12, 7, 24, 34, 20] }]
}

export function mentorSheets(data: ReportData): Sheet[] {
  const domainTitle = new Map(data.domains.map((d) => [d.id, d.title]))
  const teamByLogin = new Map(data.teams.map((t) => [t.loginId, t]))
  const boardRounds = data.rounds.filter((r) => r.published).length ? data.rounds.filter((r) => r.published) : data.rounds.filter((r) => r.live)
  const board = boardRounds.length ? leaderboard(boardRounds, data.teams) : null
  const boardRank = new Map(board?.rows.map((r) => [r.team.studentUserId, r]) ?? [])
  const directory: Cell[][] = [
    ["Reg. no.", "Name", "Phone", "Email", "Themes", "Lab venue", "Teams", "Team numbers", "Photo", "Bio", "Changed starting password"],
    ...data.mentors.map((m) => [
      m.loginId, dash(m.name), dash(m.phone), dash(m.email), m.domainIds.map((d) => domainTitle.get(d) ?? d).join("; "),
      dash(m.labVenue), m.teamLoginIds.length, m.teamLoginIds.join(", "), yes(m.hasPhoto), yes(m.hasBio), yes(!m.mustChangePassword),
    ]),
  ]
  const results: Cell[][] = [
    ["Mentor", "Reg. no.", "Team #", "Team name", "Theme", "Project", ...data.rounds.map((r) => r.name), board ? `Overall (${boardRounds.map((r) => r.name).join(" + ")})` : "Overall", "Overall rank"],
    ...data.mentors.flatMap((m) =>
      m.teamLoginIds.map((login) => {
        const t = teamByLogin.get(login)!
        const b = boardRank.get(t.studentUserId)
        return [
          dash(m.name), m.loginId, t.loginId, t.teamName, dash(t.domainTitle), dash(t.projectTitle),
          ...data.rounds.map((r) => {
            const marks = r.marks[t.studentUserId]
            return marks && Object.keys(marks).length ? Math.round(Object.values(marks).reduce((a, v) => a + v, 0) * 100) / 100 : ""
          }),
          b?.overall ?? "", b?.rank ?? "",
        ]
      }),
    ),
  ]
  return [
    { name: "Mentors", rows: directory, widths: [15, 22, 13, 28, 50, 9, 7, 13, 7, 6, 14] },
    { name: "Mentor-wise results", rows: results, widths: [22, 15, 7, 24, 34, 30, ...data.rounds.map(() => 14), 16, 12] },
  ]
}

export function roundSheets(data: ReportData, round: ReportRound): Sheet[] {
  const rows = roundResults(round, data.teams)
  const teamById = new Map(data.teams.map((t) => [t.studentUserId, t]))
  const results: Cell[][] = [
    ["Rank", "Team #", "Team name", "Theme", "Mentor", "Judging room", ...round.criteria.map((c) => `${c.label} (/${c.max})`), `Total (/${round.max})`, "Evaluator sheets"],
    ...rows.map((r) => [
      r.rank ?? "", r.team.loginId, r.team.teamName, dash(r.team.domainTitle), dash(r.team.mentorName), dash(r.team.judgingVenue),
      ...round.criteria.map((c) => r.marks[c.label] ?? ""), r.total ?? "", r.sheets,
    ]),
  ]
  const sheets: Cell[][] = [
    ["Team #", "Team name", "Evaluator", "Login", "Role", ...round.criteria.map((c) => `${c.label} (/${c.max})`), "Total", "Saved"],
    ...round.sheets
      .map((s) => ({ s, t: teamById.get(s.studentUserId) }))
      .filter((x) => x.t)
      .sort((a, b) => Number(a.t!.loginId) - Number(b.t!.loginId) || a.s.evaluatorLoginId.localeCompare(b.s.evaluatorLoginId))
      .map(({ s, t }) => [
        t!.loginId, t!.teamName, dash(s.evaluatorName), s.evaluatorLoginId, s.evaluatorRole === "jury" ? "External jury" : "Faculty",
        ...round.criteria.map((c) => s.marks[c.label] ?? ""), s.total, when(s.updatedAt),
      ]),
  ]
  return [
    { name: `Results - ${round.name}`, rows: results, widths: [6, 7, 24, 34, 20, 12, ...round.criteria.map(() => 14), 12, 15] },
    { name: `Sheets - ${round.name}`, rows: sheets, widths: [7, 24, 22, 14, 13, ...round.criteria.map(() => 14), 8, 18] },
  ]
}

export function evaluatorSheets(data: ReportData): Sheet[] {
  const rows: Cell[][] = [
    ["Login", "Name", "Role", "Judging rooms", "Extra teams", ...data.rounds.map((r) => `${r.name} sheets`), "Total sheets"],
    ...data.evaluators.map((e) => {
      const per = data.rounds.map((r) => r.sheets.filter((s) => s.evaluatorLoginId === e.loginId).length)
      return [e.loginId, dash(e.name), e.role === "jury" ? "External jury" : "Faculty", e.rooms.join(", "), e.extraTeamLoginIds.join(", "), ...per, per.reduce((a, b) => a + b, 0)]
    }),
  ]
  return [{ name: "Evaluators", rows, widths: [16, 24, 13, 26, 14, ...data.rounds.map(() => 16), 12] }]
}

export function leaderboardSheets(data: ReportData, rounds: ReportRound[]): Sheet[] {
  const { rows, max } = leaderboard(rounds, data.teams)
  const missing = rounds.length > 1
  return [
    {
      name: "Leaderboard",
      rows: [
        ["Rank", "Team #", "Team name", "Theme", "Mentor", "Project", ...rounds.map((r) => `${r.name} (/${r.max})`), missing ? `Average (/${Math.round(max)})` : `Score (/${Math.round(max)})`],
        ...rows.map((r) => [
          r.rank, r.team.loginId, r.team.teamName, dash(r.team.domainTitle), dash(r.team.mentorName), dash(r.team.projectTitle),
          ...rounds.map((x) => r.scores[x.id] ?? (missing ? 0 : "")), r.overall,
        ]),
      ],
      widths: [6, 7, 24, 34, 20, 30, ...rounds.map(() => 16), 14],
    },
  ]
}

export function accountSheets(data: ReportData): Sheet[] {
  const label: Record<string, string> = { member: "Team", mentor: "Mentor", faculty: "Faculty", jury: "External jury", admin: "Admin" }
  return [
    {
      name: "Accounts",
      rows: [
        ["Login", "Role", "Name", "Phone", "Email", "Hidden", "Changed starting password"],
        ...data.accounts.map((a) => [a.loginId, label[a.role] ?? a.role, dash(a.name), dash(a.phone), dash(a.email), yes(a.hidden), yes(!a.mustChangePassword)]),
      ],
      widths: [16, 13, 26, 14, 30, 8, 14],
    },
  ]
}

export function selectionSheets(data: ReportData): Sheet[] {
  return [
    {
      name: "Theme selections",
      rows: [
        ["Theme", "Kind", "Login", "Name"],
        ...data.domains.flatMap((d) => [
          ...data.teams.filter((t) => t.domainId === d.id).map((t) => [d.title, "Team", t.loginId, t.teamName]),
          ...data.mentors.filter((m) => m.domainIds.includes(d.id)).map((m) => [d.title, "Mentor", m.loginId, dash(m.name)]),
        ]),
        ...data.teams.filter((t) => !t.domainId).map((t) => ["(none yet)", "Team", t.loginId, t.teamName]),
        ...data.mentors.filter((m) => m.domainIds.length === 0).map((m) => ["(none yet)", "Mentor", m.loginId, dash(m.name)]),
      ],
      widths: [50, 8, 15, 26],
    },
    {
      name: "Rooms",
      rows: [
        ["Team #", "Team name", "Lab venue", "Judging room", "Waiting room"],
        ...data.teams.map((t) => [t.loginId, t.teamName, dash(t.labVenue), dash(t.judgingVenue), dash(t.waitingVenue)]),
      ],
      widths: [7, 24, 10, 13, 13],
    },
    {
      name: "Timeline",
      rows: [["Phase", "Session", "Date", "Title", "Venue", "Resource"], ...data.timeline.map((e) => [e.phase, e.label, dash(e.date), e.title, dash(e.venue), dash(e.resource)])],
      widths: [10, 10, 26, 50, 40, 40],
    },
  ]
}

/** Every record in one workbook. */
export function everythingSheets(data: ReportData): Sheet[] {
  return [
    ...statisticsSheets(data),
    ...teamSheets(data),
    ...studentSheets(data),
    ...mentorSheets(data),
    ...evaluatorSheets(data),
    ...data.rounds.flatMap((r) => roundSheets(data, r)),
    ...accountSheets(data),
    ...selectionSheets(data),
  ]
}
