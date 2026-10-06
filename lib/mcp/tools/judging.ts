import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { resolveJudgingVenue as resolveTeamVenue, type JudgingAssignment } from "@/lib/judging"
import { getLeaderboard } from "@/lib/leaderboard"
import {
  run,
  cleanMarks,
  listJudgingVenues,
  listRounds,
  resolveDomain,
  resolveJudgingVenue,
  resolveRound,
  resolveTeam,
  resolveUser,
  ToolError,
  type McpContext,
} from "@/lib/mcp/context"

const READ = { readOnlyHint: true, openWorldHint: false } as const
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const

const kind = z.enum(["judging", "waiting"]).default("judging")
const criterion = z.object({ label: z.string().min(1), max: z.number().positive() })
const marks = z
  .record(z.string(), z.number().nullable())
  .describe('Marks keyed by the round\'s criterion labels, e.g. {"Feasibility": 12}. null leaves a criterion unmarked.')

type SubmissionRow = {
  student_user_id: string
  login_id: string
  team_name: string | null
  domain_id: string | null
  mentor_user_id: string | null
  mentor_name: string | null
  project_title: string | null
}

type EvaluatorRow = {
  user_id: string
  login_id: string
  name: string | null
  role: "faculty" | "jury"
  venue_ids: string[] | null
  team_ids: string[] | null
  evaluated_count: number
}

async function loadTeams(ctx: McpContext) {
  return (await ctx.rpc<SubmissionRow[]>("admin_list_submissions", { p_admin_user_id: ctx.adminId })) ?? []
}

async function loadAssignments(ctx: McpContext): Promise<JudgingAssignment[]> {
  const rows =
    (await ctx.rpc<{ kind: "judging" | "waiting"; scope: JudgingAssignment["scope"]; ref_id: string; judging_venue_id: string }[]>(
      "admin_list_judging_assignments",
      { p_admin_user_id: ctx.adminId },
    )) ?? []
  return rows.map((r) => ({ kind: r.kind ?? "judging", scope: r.scope, refId: r.ref_id, venueId: r.judging_venue_id }))
}

const byNumber = (a: { login_id: string }, b: { login_id: string }) =>
  Number(a.login_id) - Number(b.login_id) || a.login_id.localeCompare(b.login_id)

export function registerJudgingTools(server: McpServer, ctx: McpContext) {
  // ---------------- overview ----------------
  server.registerTool(
    "get_overview",
    {
      title: "Admin overview",
      description:
        "A snapshot of the whole programme: account counts by role, the live judging round, every round's scoring progress, judging venues and portal settings. A good first call.",
      inputSchema: {},
      annotations: READ,
    },
    run(ctx, async () => {
      const [users, rounds, summaries, judging, waiting, settings] = await Promise.all([
        ctx.rpc<{ role: string; hidden: boolean }[]>("admin_list_users", { p_admin_user_id: ctx.adminId }),
        listRounds(ctx),
        ctx.rpc<{ preset_id: string; scored_count: number; average_total: number | null }[]>(
          "admin_list_round_score_summaries",
          { p_admin_user_id: ctx.adminId },
        ),
        listJudgingVenues(ctx, "judging"),
        listJudgingVenues(ctx, "waiting"),
        ctx.rpc<Record<string, boolean>[]>("get_app_settings"),
      ])
      const accounts: Record<string, number> = {}
      for (const u of users ?? []) if (!u.hidden) accounts[u.role] = (accounts[u.role] ?? 0) + 1
      return {
        accounts,
        live_round: rounds.find((r) => r.is_active)?.name ?? null,
        rounds: rounds.map((r) => {
          const s = summaries?.find((x) => x.preset_id === r.id)
          return {
            name: r.name,
            live: r.is_active,
            on_leaderboard: r.scores_published,
            criteria: r.rubric.length,
            out_of: r.rubric.reduce((a, c) => a + Number(c.max || 0), 0),
            teams_scored: Number(s?.scored_count ?? 0),
            average: s?.average_total == null ? null : Number(s.average_total),
            evaluator_sheets: r.evaluation_count,
          }
        }),
        judging_venues: judging.map((v) => v.name),
        waiting_venues: waiting.map((v) => v.name),
        settings: settings?.[0] ?? null,
      }
    }),
  )

  // ---------------- venues + assignments ----------------
  server.registerTool(
    "get_judging_schedule",
    {
      title: "Judging schedule",
      description:
        "Judging and waiting venues, the evaluators covering each judging venue, the report / faculty-PDF headings and timing, and every team's resolved presentation and waiting venue (a team's own assignment wins, then its mentor's, then its domain's).",
      inputSchema: { venue: z.string().optional().describe("Only teams presenting in this judging venue") },
      annotations: READ,
    },
    run(ctx, async ({ venue }) => {
      const [judging, waiting, assignments, teams, evaluators, settingsRows] = await Promise.all([
        listJudgingVenues(ctx, "judging"),
        listJudgingVenues(ctx, "waiting"),
        loadAssignments(ctx),
        loadTeams(ctx),
        ctx.rpc<EvaluatorRow[]>("admin_list_evaluators", { p_admin_user_id: ctx.adminId }),
        ctx.rpc<{ report_heading: string; faculty_heading: string; faculty_timing: string }[] | object>(
          "admin_get_judging_settings",
          { p_admin_user_id: ctx.adminId },
        ),
      ])
      const name = new Map([...judging, ...waiting].map((v) => [v.id, v.name]))
      const filter = venue ? await resolveJudgingVenue(ctx, venue, "judging") : null
      const settings = (Array.isArray(settingsRows) ? settingsRows[0] : settingsRows) as
        | { report_heading: string; faculty_heading: string; faculty_timing: string }
        | undefined
      const all = teams
        .map((t) => {
          const team = { studentUserId: t.student_user_id, mentorUserId: t.mentor_user_id, domainId: t.domain_id }
          const j = resolveTeamVenue(assignments, team, "judging")
          const w = resolveTeamVenue(assignments, team, "waiting")
          return {
            team: t.login_id,
            team_name: t.team_name,
            mentor: t.mentor_name,
            judging_venue: j.venueId ? (name.get(j.venueId) ?? null) : null,
            judging_venue_set_by: j.source,
            waiting_venue: w.venueId ? (name.get(w.venueId) ?? null) : null,
            _venueId: j.venueId,
            login_id: t.login_id,
          }
        })
        .sort(byNumber)
      const rows = all.filter((r) => !filter || r._venueId === filter.id).map(({ _venueId, login_id, ...r }) => r)
      return {
        settings: settings
          ? {
              report_heading: settings.report_heading,
              faculty_heading: settings.faculty_heading,
              faculty_timing: settings.faculty_timing,
            }
          : null,
        judging_venues: judging.map((v) => ({
          name: v.name,
          evaluators: (evaluators ?? [])
            .filter((e) => e.venue_ids?.includes(v.id))
            .map((e) => ({ login_id: e.login_id, name: e.name, role: e.role })),
          teams: all.filter((r) => r._venueId === v.id).length,
        })),
        waiting_venues: waiting.map((v) => v.name),
        unassigned_teams: all.filter((r) => !r._venueId).map((r) => r.team),
        teams: rows,
      }
    }),
  )

  server.registerTool(
    "manage_judging_venue",
    {
      title: "Add, rename or delete a judging / waiting venue",
      description:
        "action 'add' (name), 'rename' (venue + new_name) or 'delete' (venue). Deleting a venue also drops every assignment pointing at it and removes it from evaluators.",
      inputSchema: {
        action: z.enum(["add", "rename", "delete"]),
        kind,
        venue: z.string().optional().describe("Existing venue name (rename / delete)"),
        name: z.string().optional().describe("New venue name (add / rename)"),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ action, kind, venue, name }) => {
      if (action === "add") {
        if (!name?.trim()) throw new ToolError("name is required.")
        const row = await ctx.rpc<{ id: string; name: string }>("admin_add_judging_venue", {
          p_admin_user_id: ctx.adminId,
          p_name: name.trim(),
          p_kind: kind,
        })
        ctx.purge(CACHE_TAGS.judging)
        return { ok: true, venue: row?.name ?? name.trim(), kind }
      }
      if (!venue) throw new ToolError("venue is required.")
      const v = await resolveJudgingVenue(ctx, venue, kind)
      if (action === "rename") {
        if (!name?.trim()) throw new ToolError("name is required.")
        await ctx.rpc("admin_rename_judging_venue", { p_admin_user_id: ctx.adminId, p_id: v.id, p_name: name.trim() })
      } else {
        await ctx.rpc("admin_delete_judging_venue", { p_admin_user_id: ctx.adminId, p_id: v.id })
      }
      ctx.purge(CACHE_TAGS.judging)
      return { ok: true, action, venue: v.name }
    }),
  )

  server.registerTool(
    "set_judging_assignment",
    {
      title: "Assign a venue to a team, mentor or domain",
      description:
        "Layered assignment of a judging (presentation) or waiting venue. scope 'team' (ref = team number) beats 'mentor' (ref = mentor login ID, covers both their teams) beats 'theme' (ref = domain id or title). venue null clears that layer.",
      inputSchema: {
        scope: z.enum(["team", "mentor", "theme"]),
        ref: z.string(),
        venue: z.string().nullable(),
        kind,
      },
      annotations: WRITE,
    },
    run(ctx, async ({ scope, ref, venue, kind }) => {
      const refId =
        scope === "team"
          ? (await resolveTeam(ctx, ref)).id
          : scope === "mentor"
            ? (await resolveUser(ctx, ref, ["mentor"])).id
            : (await resolveDomain(ctx, ref)).id
      const v = venue ? await resolveJudgingVenue(ctx, venue, kind) : null
      await ctx.rpc("admin_set_judging_assignment", {
        p_admin_user_id: ctx.adminId,
        p_scope: scope,
        p_ref_id: refId,
        p_venue_id: v?.id ?? null,
        p_kind: kind,
      })
      ctx.purge(CACHE_TAGS.judging)
      return { ok: true, scope, ref, kind, venue: v?.name ?? null }
    }),
  )

  server.registerTool(
    "set_judging_settings",
    {
      title: "Judging PDF headings and timing",
      description:
        "Report heading on the judging sheets, the faculty-schedule PDF title, and the timing printed on it. Fields you leave out keep their value.",
      inputSchema: {
        report_heading: z.string().min(1).optional(),
        faculty_heading: z.string().min(1).optional(),
        faculty_timing: z.string().min(1).optional(),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ report_heading, faculty_heading, faculty_timing }) => {
      const raw = await ctx.rpc<unknown>("admin_get_judging_settings", { p_admin_user_id: ctx.adminId })
      const cur = (Array.isArray(raw) ? raw[0] : raw) as {
        report_heading: string
        rubric: unknown
        faculty_heading: string
        faculty_timing: string
      }
      await ctx.rpc("admin_set_judging_settings", {
        p_admin_user_id: ctx.adminId,
        p_heading: report_heading ?? cur.report_heading,
        p_rubric: cur.rubric,
        p_faculty_heading: faculty_heading ?? cur.faculty_heading,
        p_faculty_timing: faculty_timing ?? cur.faculty_timing,
      })
      ctx.purge(CACHE_TAGS.judging, CACHE_TAGS.rubricPresets)
      return { ok: true }
    }),
  )

  // ---------------- rounds ----------------
  server.registerTool(
    "list_rounds",
    {
      title: "Judging rounds",
      description:
        "Every judging round (rubric preset) with its criteria, whether it's live (what evaluators mark against and students see), whether it's on the leaderboard, and scoring progress.",
      inputSchema: {},
      annotations: READ,
    },
    run(ctx, async () => {
      const [rounds, summaries] = await Promise.all([
        listRounds(ctx),
        ctx.rpc<{ preset_id: string; scored_count: number; average_total: number | null; top_total: number | null }[]>(
          "admin_list_round_score_summaries",
          { p_admin_user_id: ctx.adminId },
        ),
      ])
      return rounds.map((r) => {
        const s = summaries?.find((x) => x.preset_id === r.id)
        return {
          id: r.id,
          name: r.name,
          live: r.is_active,
          on_leaderboard: r.scores_published,
          criteria: r.rubric,
          out_of: r.rubric.reduce((a, c) => a + Number(c.max || 0), 0),
          teams_scored: Number(s?.scored_count ?? 0),
          average: s?.average_total == null ? null : Number(s.average_total),
          top: s?.top_total == null ? null : Number(s.top_total),
          evaluator_sheets: r.evaluation_count,
        }
      })
    }),
  )

  server.registerTool(
    "save_round",
    {
      title: "Create or edit a judging round",
      description:
        "Pass `round` to edit an existing one (name or id), or omit it to create a new round. Renaming a criterion does not move marks already entered under the old label.",
      inputSchema: {
        round: z.string().optional(),
        name: z.string().min(1),
        criteria: z.array(criterion).min(1),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ round, name, criteria }) => {
      const existing = round ? await resolveRound(ctx, round) : null
      const id = await ctx.rpc<string>("admin_save_rubric_preset", {
        p_admin_user_id: ctx.adminId,
        p_id: existing?.id ?? null,
        p_name: name.trim(),
        p_rubric: criteria.map((c) => ({ label: c.label.trim(), max: Math.round(c.max) })),
      })
      ctx.purge(CACHE_TAGS.judging, CACHE_TAGS.rubricPresets)
      return { ok: true, id, name: name.trim(), created: !existing }
    }),
  )

  server.registerTool(
    "activate_round",
    {
      title: "Make a round live",
      description:
        "The live round is what students see as the rubric, what the judging PDFs print, and what every faculty / jury member marks against. Only one round is live at a time.",
      inputSchema: { round: z.string() },
      annotations: WRITE,
    },
    run(ctx, async ({ round }) => {
      const r = await resolveRound(ctx, round)
      await ctx.rpc("admin_activate_rubric_preset", { p_admin_user_id: ctx.adminId, p_id: r.id })
      ctx.purge(CACHE_TAGS.judging, CACHE_TAGS.rubricPresets)
      return { ok: true, live_round: r.name }
    }),
  )

  server.registerTool(
    "publish_round",
    {
      title: "Show or hide a round on the leaderboard",
      description:
        "Toggle whether this round's scores appear on the team and mentor leaderboards. With two or more rounds shown, teams are ranked by their average.",
      inputSchema: { round: z.string(), published: z.boolean() },
      annotations: WRITE,
    },
    run(ctx, async ({ round, published }) => {
      const r = await resolveRound(ctx, round)
      await ctx.rpc("admin_set_round_published", { p_admin_user_id: ctx.adminId, p_preset_id: r.id, p_published: published })
      return { ok: true, round: r.name, on_leaderboard: published }
    }),
  )

  server.registerTool(
    "delete_round",
    {
      title: "Delete a judging round",
      description:
        "Deletes a round. Refused while it is live or still holds scores. Evaluator sheets filed against it are deleted with it — check with the user first.",
      inputSchema: { round: z.string() },
      annotations: DESTRUCTIVE,
    },
    run(ctx, async ({ round }) => {
      const r = await resolveRound(ctx, round)
      await ctx.rpc("admin_delete_rubric_preset", { p_admin_user_id: ctx.adminId, p_id: r.id })
      ctx.purge(CACHE_TAGS.judging, CACHE_TAGS.rubricPresets)
      return { ok: true, deleted: r.name }
    }),
  )

  // ---------------- evaluators ----------------
  server.registerTool(
    "list_evaluators",
    {
      title: "Faculty and jury evaluators",
      description: "Every faculty / jury account with its judging venues, extra individual teams, and how many teams it has marked in the live round.",
      inputSchema: {},
      annotations: READ,
    },
    run(ctx, async () => {
      const [evaluators, venues, teams] = await Promise.all([
        ctx.rpc<EvaluatorRow[]>("admin_list_evaluators", { p_admin_user_id: ctx.adminId }),
        listJudgingVenues(ctx, "judging"),
        loadTeams(ctx),
      ])
      const venueName = new Map(venues.map((v) => [v.id, v.name]))
      const teamNo = new Map(teams.map((t) => [t.student_user_id, t.login_id]))
      return (evaluators ?? []).map((e) => ({
        login_id: e.login_id,
        name: e.name,
        role: e.role,
        venues: (e.venue_ids ?? []).map((id) => venueName.get(id) ?? id),
        extra_teams: (e.team_ids ?? []).map((id) => teamNo.get(id) ?? id),
        marked_in_live_round: Number(e.evaluated_count ?? 0),
      }))
    }),
  )

  server.registerTool(
    "set_evaluator_scope",
    {
      title: "Set which teams an evaluator marks",
      description:
        "Replace a faculty / jury member's judging venues and/or extra individual teams. They mark every team presenting in their venues plus the extra teams. Pass [] to clear.",
      inputSchema: {
        evaluator_login_id: z.string(),
        venues: z.array(z.string()).optional().describe("Judging venue names — replaces the current list"),
        extra_teams: z.array(z.string()).optional().describe("Team numbers — replaces the current list"),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ evaluator_login_id, venues, extra_teams }) => {
      if (!venues && !extra_teams) throw new ToolError("Pass venues and/or extra_teams.")
      const e = await resolveUser(ctx, evaluator_login_id, ["faculty", "jury"])
      if (venues) {
        const vs = await Promise.all(venues.map((v) => resolveJudgingVenue(ctx, v, "judging")))
        await ctx.rpc("admin_set_evaluator_venues", {
          p_admin_user_id: ctx.adminId,
          p_evaluator_user_id: e.id,
          p_venue_ids: vs.map((v) => v.id),
        })
      }
      if (extra_teams) {
        const ts = await Promise.all(extra_teams.map((t) => resolveTeam(ctx, t)))
        await ctx.rpc("admin_set_evaluator_teams", {
          p_admin_user_id: ctx.adminId,
          p_evaluator_user_id: e.id,
          p_student_ids: ts.map((t) => t.id),
        })
      }
      return { ok: true, evaluator: e.loginId }
    }),
  )

  // ---------------- scores ----------------
  server.registerTool(
    "get_round_scores",
    {
      title: "Scores for a round",
      description:
        "Every team's score in one round (\"active\" for the live one): the round score per criterion and total, each evaluator's own sheet, and the team's presentation venue. The round score follows evaluator sheets (averaged per criterion) unless an admin edited it afterwards.",
      inputSchema: {
        round: z.string().describe('Round name or id, or "active"'),
        venue: z.string().optional().describe("Only teams presenting in this judging venue"),
        only_unscored: z.boolean().optional(),
      },
      annotations: READ,
    },
    run(ctx, async ({ round, venue, only_unscored }) => {
      const r = await resolveRound(ctx, round)
      const [scores, sheets, teams, assignments, venues] = await Promise.all([
        ctx.rpc<{ student_user_id: string; marks: Record<string, number>; total: number }[]>("admin_list_round_scores", {
          p_admin_user_id: ctx.adminId,
          p_preset_id: r.id,
        }),
        ctx.rpc<{ student_user_id: string; evaluator_login_id: string; evaluator_name: string | null; marks: unknown; total: number }[]>(
          "admin_list_evaluations",
          { p_admin_user_id: ctx.adminId, p_preset_id: r.id },
        ),
        loadTeams(ctx),
        loadAssignments(ctx),
        listJudgingVenues(ctx, "judging"),
      ])
      const venueName = new Map(venues.map((v) => [v.id, v.name]))
      const filter = venue ? await resolveJudgingVenue(ctx, venue, "judging") : null
      const rows = teams
        .map((t) => {
          const v = resolveTeamVenue(
            assignments,
            { studentUserId: t.student_user_id, mentorUserId: t.mentor_user_id, domainId: t.domain_id },
            "judging",
          ).venueId
          const s = scores?.find((x) => x.student_user_id === t.student_user_id)
          return {
            login_id: t.login_id,
            team: t.login_id,
            team_name: t.team_name,
            venue_id: v,
            venue: v ? (venueName.get(v) ?? null) : null,
            total: s ? Number(s.total) : null,
            marks: s?.marks ?? null,
            evaluator_sheets: (sheets ?? [])
              .filter((x) => x.student_user_id === t.student_user_id)
              .map((x) => ({ evaluator: x.evaluator_name ?? x.evaluator_login_id, total: Number(x.total), marks: x.marks })),
          }
        })
        .filter((x) => !filter || x.venue_id === filter.id)
        .filter((x) => !only_unscored || x.total == null)
        .sort(byNumber)
        .map(({ login_id, venue_id, ...x }) => x)
      return {
        round: r.name,
        live: r.is_active,
        criteria: r.rubric,
        scored: rows.filter((x) => x.total != null).length,
        teams: rows,
      }
    }),
  )

  server.registerTool(
    "set_team_score",
    {
      title: "Enter or edit a team's round score",
      description:
        "Set the admin score for a team in a round, criterion by criterion. Marks are checked against the round's criteria and maxima. Pass {} to clear the team's score. A later evaluator save for this team recomputes it from the evaluator sheets.",
      inputSchema: { round: z.string(), team: z.string(), marks },
      annotations: WRITE,
    },
    run(ctx, async ({ round, team, marks }) => {
      const [r, t] = await Promise.all([resolveRound(ctx, round), resolveTeam(ctx, team)])
      const clean = cleanMarks(r.rubric, marks)
      const total = await ctx.rpc<number | null>("admin_set_round_scores", {
        p_admin_user_id: ctx.adminId,
        p_preset_id: r.id,
        p_student_user_id: t.id,
        p_marks: Object.keys(clean).length ? clean : null,
      })
      return { ok: true, round: r.name, team: t.loginId, marks: clean, total: total == null ? null : Number(total) }
    }),
  )

  server.registerTool(
    "set_evaluator_sheet",
    {
      title: "Edit an evaluator's marks for a team",
      description:
        "Override one faculty / jury member's sheet for a team in a round (as if they had entered it). The team's round score is recomputed from all sheets. Pass {} to delete the sheet.",
      inputSchema: { round: z.string(), evaluator_login_id: z.string(), team: z.string(), marks },
      annotations: WRITE,
    },
    run(ctx, async ({ round, evaluator_login_id, team, marks }) => {
      const [r, e, t] = await Promise.all([
        resolveRound(ctx, round),
        resolveUser(ctx, evaluator_login_id, ["faculty", "jury"]),
        resolveTeam(ctx, team),
      ])
      const clean = cleanMarks(r.rubric, marks)
      const total = await ctx.rpc<number | null>("admin_set_evaluation", {
        p_admin_user_id: ctx.adminId,
        p_preset_id: r.id,
        p_evaluator_user_id: e.id,
        p_student_user_id: t.id,
        p_marks: Object.keys(clean).length ? clean : null,
      })
      return { ok: true, round: r.name, evaluator: e.loginId, team: t.loginId, total: total == null ? null : Number(total) }
    }),
  )

  server.registerTool(
    "get_leaderboard",
    {
      title: "Leaderboard",
      description:
        "The leaderboard exactly as teams and mentors see it: rounds currently published, each team's score per round, and rank (by the average when two or more rounds are published; a missing round counts as 0).",
      inputSchema: { top: z.number().int().positive().optional().describe("Only the top N") },
      annotations: READ,
    },
    run(ctx, async ({ top }) => {
      const { rounds, entries } = await getLeaderboard(ctx.adminId)
      const roundName = new Map(rounds.map((r) => [r.id, r.name]))
      return {
        rounds: rounds.map((r) => ({ name: r.name, out_of: r.max })),
        ranked_by: rounds.length > 1 ? "average" : rounds.length === 1 ? rounds[0].name : null,
        entries: (top ? entries.slice(0, top) : entries).map((e) => ({
          rank: e.rank,
          team: e.loginId,
          team_name: e.teamName,
          project_title: e.projectTitle,
          mentor: e.mentorName,
          scores: Object.fromEntries(Object.entries(e.scores).map(([id, v]) => [roundName.get(id) ?? id, v])),
          overall: e.overall,
        })),
      }
    }),
  )
}
