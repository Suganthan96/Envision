import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { getCurrentEdition, getEditions, getRequestEdition } from "@/lib/edition"
import { effectiveTiebreak } from "@/lib/tiebreak"
import { rankTeams } from "@/lib/leaderboard-rank"
import { getRoundScores } from "@/lib/round-scores"
import { getSubmissionsForAdmin } from "@/lib/admin-directories"
import { searchManual } from "@/lib/manual-search"
import { listRounds, resolveRound, run, ToolError, type McpContext } from "@/lib/mcp/context"

/**
 * The newer admin features: programme years, tie-break order, previewing a
 * ranking from any mix of rounds, and the admin manual.
 */

const READ = { readOnlyHint: true, openWorldHint: false } as const
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const

const SITE = "https://envisionlicet.vercel.app"
const MENTOR_ID = /^3111\d{8}$/

export function registerExtraTools(server: McpServer, ctx: McpContext) {
  // ---------------- programme years ----------------
  server.registerTool(
    "list_years",
    {
      title: "Programme years",
      description:
        "Every programme year (e.g. 2026-27) with its teams, mentors, evaluators, rounds, teams scored and decks submitted, and which year is current (the one teams, mentors and evaluators sign in to). Every other tool works on the current year unless you pass `year`.",
      inputSchema: {},
      annotations: READ,
    },
    run(ctx, async () => {
      const [years, stats] = await Promise.all([
        getEditions(),
        ctx.rpc<
          { edition_id: string; teams: number; mentors: number; evaluators: number; rounds: number; scored: number; submitted: number }[]
        >("admin_edition_stats", { p_admin_user_id: ctx.adminId }),
      ])
      return years.map((y) => {
        const s = stats?.find((r) => r.edition_id === y.id)
        return {
          year: y.id,
          label: y.label,
          current: y.isCurrent,
          teams: Number(s?.teams ?? 0),
          mentors: Number(s?.mentors ?? 0),
          evaluators: Number(s?.evaluators ?? 0),
          rounds: Number(s?.rounds ?? 0),
          teams_scored: Number(s?.scored ?? 0),
          decks_submitted: Number(s?.submitted ?? 0),
        }
      })
    }),
  )

  server.registerTool(
    "start_year",
    {
      title: "Start a new programme year",
      description:
        "Creates a new year side by side with the others; no year is ever changed or deleted. Optionally copies themes and capacities, round templates (criteria and tie-break, no scores), rooms, the timeline and guidelines from another year, and creates team logins 1..team_count and mentor logins for the given registration numbers (all with password licet@123). Teams, projects, mentors, allocations, selections and scores are never copied. Leave make_current false unless the user wants everyone switched over now. Confirm the details with the user first.",
      inputSchema: {
        new_year: z.string().regex(/^\d{4}-\d{2}$/).describe("The new year, e.g. 2027-28"),
        copy_from: z.string().optional().describe("Year to copy from (default: the current year)"),
        copy: z
          .object({
            themes: z.boolean().optional(),
            rounds: z.boolean().optional(),
            rooms: z.boolean().optional(),
            timeline: z.boolean().optional(),
            guidelines: z.boolean().optional(),
          })
          .optional()
          .describe("What to copy as a starting point (default: all of it)"),
        team_count: z.number().int().min(0).max(500).default(0),
        mentor_reg_numbers: z.array(z.string()).default([]).describe("12-digit numbers starting 3111"),
        make_current: z.boolean().default(false),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ new_year, copy_from, copy, team_count, mentor_reg_numbers, make_current }) => {
      const bad = mentor_reg_numbers.map((m) => m.trim()).filter((m) => m && !MENTOR_ID.test(m))
      if (bad.length) throw new ToolError(`Not 12-digit registration numbers starting 3111: ${bad.join(", ")}`)
      const result = await ctx.rpc("admin_start_edition", {
        p_admin_user_id: ctx.adminId,
        p_edition_id: new_year,
        p_label: new_year.replace("-", "–"),
        p_from_edition: copy_from ?? null,
        p_options: {
          themes: copy?.themes ?? true,
          rounds: copy?.rounds ?? true,
          rooms: copy?.rooms ?? true,
          timeline: copy?.timeline ?? true,
          guidelines: copy?.guidelines ?? true,
        },
        p_team_count: team_count,
        p_mentor_ids: mentor_reg_numbers.map((m) => m.trim()).filter(Boolean),
        p_make_current: make_current,
      })
      ctx.purge(CACHE_TAGS.editions)
      return {
        ok: true,
        result,
        next: make_current
          ? `${new_year} is now the current year.`
          : `Set up ${new_year} by passing year: "${new_year}" to the other tools, then call set_current_year when ready.`,
      }
    }),
  )

  server.registerTool(
    "set_current_year",
    {
      title: "Make a year the current year",
      description:
        "Switches which year teams, mentors and evaluators sign in to. Logins from the previous current year stop working (their data is kept and admins can still open that year). Always confirm with the user first.",
      inputSchema: { target_year: z.string().regex(/^\d{4}-\d{2}$/) },
      annotations: DESTRUCTIVE,
    },
    run(ctx, async ({ target_year }) => {
      const years = await getEditions()
      if (!years.some((y) => y.id === target_year)) {
        throw new ToolError(`No year ${target_year}. Years: ${years.map((y) => y.id).join(", ")}.`)
      }
      await ctx.rpc("admin_set_current_edition", { p_admin_user_id: ctx.adminId, p_edition_id: target_year })
      ctx.purge(CACHE_TAGS.editions)
      return { ok: true, current_year: target_year }
    }),
  )

  // ---------------- tie-break ----------------
  server.registerTool(
    "set_round_tiebreak",
    {
      title: "Set a round's tie-break order",
      description:
        "When teams have the same total, the one with more marks in the first criterion listed ranks higher; if that is equal too, the next criterion decides, and so on. Pass criterion labels exactly as list_rounds shows them; criteria left out follow in rubric order.",
      inputSchema: { round: z.string(), order: z.array(z.string().min(1)).min(1) },
      annotations: WRITE,
    },
    run(ctx, async ({ round, order }) => {
      const r = await resolveRound(ctx, round)
      const labels = r.rubric.map((c) => c.label)
      const unknown = order.filter((l) => !labels.includes(l))
      if (unknown.length) throw new ToolError(`Not criteria of ${r.name}: ${unknown.join(", ")}. Criteria: ${labels.join(", ")}`)
      await ctx.rpc("admin_set_round_tiebreak", { p_admin_user_id: ctx.adminId, p_preset_id: r.id, p_tiebreak: order })
      ctx.purge(CACHE_TAGS.judging, CACHE_TAGS.rubricPresets)
      return { ok: true, round: r.name, tiebreak: effectiveTiebreak(labels, order) }
    }),
  )

  // ---------------- leaderboard preview ----------------
  server.registerTool(
    "preview_leaderboard",
    {
      title: "Rank teams by any mix of rounds",
      description:
        "Ranks teams by one round's total, or by the average of several rounds, using exactly the leaderboard's rule (a round a team has no score in counts as 0; ties broken by each round's tie-break order). A preview only: it doesn't publish anything. Omit `rounds` to use the published ones.",
      inputSchema: {
        rounds: z.array(z.string()).optional().describe('Round names or ids, or "active"'),
        top: z.number().int().positive().optional(),
      },
      annotations: READ,
    },
    run(ctx, async ({ rounds: wanted, top }) => {
      const all = await listRounds(ctx)
      const chosen = wanted?.length
        ? await Promise.all(wanted.map((r) => resolveRound(ctx, r)))
        : all.filter((r) => r.scores_published)
      if (chosen.length === 0) throw new ToolError("No rounds given and none are published.")
      const [teams, ...marksByRound] = await Promise.all([
        getSubmissionsForAdmin(ctx.adminId),
        ...chosen.map((r) => getRoundScores(ctx.adminId, r.id)),
      ])
      const ranked = rankTeams(
        chosen.map((r) => ({ id: r.id, tiebreak: effectiveTiebreak(r.rubric.map((c) => c.label), r.tiebreak) })),
        teams.map((t) => {
          const scores: Record<string, number> = {}
          const marks: Record<string, Record<string, number>> = {}
          chosen.forEach((r, i) => {
            const m = marksByRound[i][t.studentUserId]
            if (!m || Object.keys(m).length === 0) return
            marks[r.id] = m
            scores[r.id] = Math.round(Object.values(m).reduce((a, b) => a + b, 0) * 100) / 100
          })
          return { loginId: t.loginId, teamName: t.teamName?.trim() || `Team ${t.loginId}`, mentor: t.mentorName, scores, marks }
        }),
      )
      const missing = chosen.map((r, i) => ({
        round: r.name,
        teams_without_score: teams.filter((t) => !marksByRound[i][t.studentUserId]).length,
      }))
      return {
        ranked_by: chosen.length > 1 ? `average of ${chosen.map((r) => r.name).join(", ")}` : chosen[0].name,
        missing_scores_count_as_zero: missing.filter((m) => m.teams_without_score > 0),
        entries: (top ? ranked.slice(0, top) : ranked).map((e) => ({
          rank: e.rank,
          team: e.loginId,
          team_name: e.teamName,
          mentor: e.mentor,
          scores: Object.fromEntries(chosen.map((r) => [r.name, e.scores[r.id] ?? null])),
          overall: e.overall,
        })),
      }
    }),
  )

  // ---------------- manual ----------------
  server.registerTool(
    "search_manual",
    {
      title: "Search the admin manual",
      description:
        "Answers how-to questions about the admin portal in plain words (\"how do I start next year\", \"team forgot password\"), from the same manual admins see at /admin/manual. Use it to explain where something is done in the website.",
      inputSchema: { question: z.string().min(1) },
      annotations: READ,
    },
    run(ctx, async ({ question }) => {
      const hits = searchManual(question, 3)
      if (hits.length === 0) return { answer: null, note: "Nothing in the manual matches; try other words." }
      return hits.map(({ topic }) => ({
        title: topic.title,
        answer: topic.summary,
        steps: topic.steps ?? [],
        notes: topic.notes ?? [],
        links: (topic.links ?? []).map((l) => ({ label: l.label, url: `${SITE}${l.href}` })),
        manual: `${SITE}/admin/manual#${topic.id}`,
      }))
    }),
  )
}

/** The working year for a tool call, for including in results. */
export async function workingYear() {
  const [year, current] = await Promise.all([getRequestEdition(), getCurrentEdition()])
  return { year: year.id, current_year: current.id }
}
