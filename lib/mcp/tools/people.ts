import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { isValidMentorId, looksLikeMentorId, MENTOR_ID_ERROR } from "@/lib/mentor-login-id"
import { run, resolveUser, resolveTeam, resolveJudgingVenue, ToolError, type McpContext } from "@/lib/mcp/context"

const ROLES = ["member", "mentor", "admin", "faculty", "jury"] as const

type UserRow = {
  login_id: string
  role: string
  must_change_password: boolean
  updated_at: string
  name: string | null
  phone: string | null
  email: string | null
  hidden: boolean
}

type TeamProfileRow = {
  student_user_id: string
  login_id: string
  team_name: string | null
  team_lead_name: string | null
  venue: string | null
  domain_id: string | null
  project_title: string | null
  problem_statement: string | null
  solution_short: string | null
  solution_long: string | null
  member_count: number
  mentor_user_id: string | null
  mentor_name: string | null
  mentor_login_id: string | null
  submission_canva_url: string | null
  submission_file_url: string | null
  submission_file_name: string | null
  submission_updated_at: string | null
}

const READ = { readOnlyHint: true, openWorldHint: false } as const
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const

export function registerPeopleTools(server: McpServer, ctx: McpContext) {
  // ---------------- users ----------------
  server.registerTool(
    "list_users",
    {
      title: "List accounts",
      description:
        "Every account (teams = role 'member', whose login ID is the team number; mentors; faculty / jury evaluators; admins). Filter by role and/or a search over login ID, name, email and phone.",
      inputSchema: {
        role: z.enum(ROLES).optional(),
        search: z.string().optional().describe("Case-insensitive text to match"),
        include_hidden: z.boolean().optional().describe("Include accounts hidden from public listings (default true)"),
      },
      annotations: READ,
    },
    run(ctx, async ({ role, search, include_hidden }) => {
      const rows = (await ctx.rpc<UserRow[]>("admin_list_users", { p_admin_user_id: ctx.adminId })) ?? []
      const q = search?.trim().toLowerCase()
      const users = rows
        .filter((u) => !role || u.role === role)
        .filter((u) => include_hidden !== false || !u.hidden)
        .filter(
          (u) => !q || [u.login_id, u.name, u.email, u.phone].some((v) => v && v.toLowerCase().includes(q)),
        )
        .map((u) => ({
          login_id: u.login_id,
          role: u.role,
          name: u.name,
          email: u.email,
          phone: u.phone,
          hidden: u.hidden,
          status: u.must_change_password ? "awaiting first sign-in" : "active",
        }))
      return { count: users.length, users }
    }),
  )

  server.registerTool(
    "add_user",
    {
      title: "Add an account",
      description:
        "Create a team (role 'member', login ID = team number), mentor (login ID = 12-digit registration number starting 3111), or faculty / jury evaluator. Password defaults to licet@123. Teams and mentors must change it at first sign-in; faculty and jury don't. Evaluators can be given judging venues straight away.",
      inputSchema: {
        login_id: z.string(),
        role: z.enum(["member", "mentor", "faculty", "jury"]),
        name: z.string().optional().describe("Team name, or the person's name (e.g. 'Dr X, AP/CSE')"),
        password: z.string().min(6).optional(),
        judging_venues: z.array(z.string()).optional().describe("Faculty / jury only: judging venue names"),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ login_id, role, name, password, judging_venues }) => {
      const loginId = login_id.trim()
      if (role === "mentor" && !isValidMentorId(loginId)) throw new ToolError(MENTOR_ID_ERROR)
      const id = await ctx.rpc<string>("admin_add_user", {
        p_admin_user_id: ctx.adminId,
        p_login_id: loginId,
        p_role: role,
        p_password: password ?? "licet@123",
        p_name: name ?? null,
      })
      if (judging_venues?.length && (role === "faculty" || role === "jury")) {
        const venues = await Promise.all(judging_venues.map((v) => resolveJudgingVenue(ctx, v, "judging")))
        await ctx.rpc("admin_set_evaluator_venues", {
          p_admin_user_id: ctx.adminId,
          p_evaluator_user_id: id,
          p_venue_ids: venues.map((v) => v.id),
        })
      }
      ctx.purge(CACHE_TAGS.publicShowcase)
      return { ok: true, user_id: id, login_id: loginId, role, default_password: !password }
    }),
  )

  server.registerTool(
    "update_user",
    {
      title: "Edit an account",
      description:
        "Change an account's name, phone, email or login ID, or switch an evaluator between faculty and jury. Only the fields you pass change.",
      inputSchema: {
        login_id: z.string().describe("Current login ID"),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        new_login_id: z.string().optional(),
        evaluator_role: z.enum(["faculty", "jury"]).optional(),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ login_id, name, phone, email, new_login_id, evaluator_role }) => {
      const target = await resolveUser(ctx, login_id)
      const next = new_login_id?.trim()
      if (new_login_id !== undefined && !next) throw new ToolError("A login ID cannot be blank.")
      if (next && next !== target.loginId && (target.role === "mentor" || looksLikeMentorId(next)) && !isValidMentorId(next)) {
        throw new ToolError(MENTOR_ID_ERROR)
      }
      if (evaluator_role && target.role !== "faculty" && target.role !== "jury") {
        throw new ToolError("Only faculty and jury accounts can switch between faculty and jury.")
      }
      await ctx.rpc("admin_update_user", {
        p_admin_user_id: ctx.adminId,
        p_login_id: target.loginId,
        p_name: name ?? null,
        p_phone: phone ?? null,
        p_email: email ?? null,
        p_role: evaluator_role ?? null,
        p_new_login_id: next || null,
      })
      ctx.purge(CACHE_TAGS.publicShowcase)
      return { ok: true, login_id: next || target.loginId }
    }),
  )

  server.registerTool(
    "reset_password",
    {
      title: "Reset a password",
      description:
        "Set a new password for any account. Teams and mentors will be asked to change it at next sign-in; faculty and jury won't.",
      inputSchema: { login_id: z.string(), new_password: z.string().min(6) },
      annotations: WRITE,
    },
    run(ctx, async ({ login_id, new_password }) => {
      const target = await resolveUser(ctx, login_id)
      await ctx.rpc("admin_reset_password", {
        p_admin_user_id: ctx.adminId,
        p_target_login_id: target.loginId,
        p_new_password: new_password,
      })
      return { ok: true }
    }),
  )

  server.registerTool(
    "set_user_hidden",
    {
      title: "Hide or show an account",
      description:
        "Hide a team or mentor from the public showcase, mentors page, leaderboard and judging lists (or bring it back). Nothing is deleted.",
      inputSchema: { login_id: z.string(), hidden: z.boolean() },
      annotations: WRITE,
    },
    run(ctx, async ({ login_id, hidden }) => {
      const target = await resolveUser(ctx, login_id)
      await ctx.rpc("admin_set_user_hidden", {
        p_admin_user_id: ctx.adminId,
        p_login_id: target.loginId,
        p_hidden: hidden,
      })
      ctx.purge(CACHE_TAGS.publicShowcase)
      return { ok: true, login_id: target.loginId, hidden }
    }),
  )

  server.registerTool(
    "delete_users",
    {
      title: "Delete accounts permanently",
      description:
        "PERMANENTLY delete accounts and everything attached to them (team roster, project, scores, mentor links). Cannot be undone — prefer set_user_hidden. Requires confirm: true; check with the user first.",
      inputSchema: {
        login_ids: z.array(z.string()).min(1),
        confirm: z.literal(true).describe("Must be true — confirms this is irreversible"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    run(ctx, async ({ login_ids }) => {
      const ids = login_ids.map((s) => s.trim()).filter(Boolean)
      const deleted = await ctx.rpc<number>("admin_delete_users", {
        p_admin_user_id: ctx.adminId,
        p_target_login_ids: ids,
      })
      ctx.purge(CACHE_TAGS.publicShowcase)
      return { ok: true, deleted_count: deleted ?? 0 }
    }),
  )

  // ---------------- teams ----------------
  server.registerTool(
    "list_teams",
    {
      title: "List teams",
      description:
        "All visible teams with team name, lead, domain, project title, mentor and submission links. Filter by search text, domain id or mentor login ID.",
      inputSchema: {
        search: z.string().optional(),
        domain_id: z.string().optional(),
        mentor_login_id: z.string().optional(),
      },
      annotations: READ,
    },
    run(ctx, async ({ search, domain_id, mentor_login_id }) => {
      const rows = (await ctx.rpc<TeamProfileRow[]>("admin_list_team_profiles", { p_admin_user_id: ctx.adminId })) ?? []
      const q = search?.trim().toLowerCase()
      const teams = rows
        .filter((t) => !domain_id || t.domain_id === domain_id)
        .filter((t) => !mentor_login_id || t.mentor_login_id === mentor_login_id)
        .filter(
          (t) =>
            !q ||
            [t.login_id, t.team_name, t.team_lead_name, t.project_title, t.mentor_name].some(
              (v) => v && v.toLowerCase().includes(q),
            ),
        )
        .sort((a, b) => Number(a.login_id) - Number(b.login_id) || a.login_id.localeCompare(b.login_id))
        .map((t) => ({
          team: t.login_id,
          team_name: t.team_name,
          team_lead: t.team_lead_name,
          members: t.member_count,
          domain_id: t.domain_id,
          project_title: t.project_title,
          mentor: t.mentor_name,
          mentor_login_id: t.mentor_login_id,
          lab_venue: t.venue,
          submission: t.submission_canva_url || t.submission_file_url || null,
        }))
      return { count: teams.length, teams }
    }),
  )

  server.registerTool(
    "get_team",
    {
      title: "Team details",
      description:
        "Everything about one team: profile, project write-up, roster, mentor, submission, and its marks in every judging round (admin marks and each evaluator's sheet).",
      inputSchema: { team: z.string().describe("Team number / login ID") },
      annotations: READ,
    },
    run(ctx, async ({ team }) => {
      const t = await resolveTeam(ctx, team)
      const [profile, members, rounds] = await Promise.all([
        ctx.rpc<TeamProfileRow[]>("admin_get_team_profile", { p_admin_user_id: ctx.adminId, p_student_user_id: t.id }),
        ctx.rpc<{ name: string; email: string | null; department: string | null }[]>("get_team_members", {
          p_user_id: t.id,
        }),
        ctx.rpc<{ id: string; name: string; is_active: boolean }[]>("admin_list_rubric_presets", {
          p_admin_user_id: ctx.adminId,
        }),
      ])
      const scores = await Promise.all(
        (rounds ?? []).map(async (r) => {
          const [own, sheets] = await Promise.all([
            ctx.rpc<{ student_user_id: string; marks: Record<string, number>; total: number }[]>(
              "admin_list_round_scores",
              { p_admin_user_id: ctx.adminId, p_preset_id: r.id },
            ),
            ctx.rpc<
              { student_user_id: string; evaluator_login_id: string; evaluator_name: string; marks: unknown; total: number }[]
            >("admin_list_evaluations", { p_admin_user_id: ctx.adminId, p_preset_id: r.id }),
          ])
          const mine = (own ?? []).find((s) => s.student_user_id === t.id)
          return {
            round: r.name,
            live: r.is_active,
            score: mine ? { total: Number(mine.total), marks: mine.marks } : null,
            evaluator_sheets: (sheets ?? [])
              .filter((s) => s.student_user_id === t.id)
              .map((s) => ({
                evaluator: s.evaluator_name ?? s.evaluator_login_id,
                evaluator_login_id: s.evaluator_login_id,
                total: Number(s.total),
                marks: s.marks,
              })),
          }
        }),
      )
      return { team: t.loginId, profile: profile?.[0] ?? null, members: members ?? [], rounds: scores }
    }),
  )

  // ---------------- mentors ----------------
  server.registerTool(
    "list_mentors",
    {
      title: "List mentors",
      description: "Every mentor with login ID, chosen domains, lab venue and the teams assigned to them (max 2 each).",
      inputSchema: {},
      annotations: READ,
    },
    run(ctx, async () => {
      const [mentors, students] = await Promise.all([
        ctx.rpc<
          { mentor_user_id: string; login_id: string; name: string | null; venue: string | null; domain_ids: string[]; assigned_student_ids: string[] }[]
        >("admin_list_assignable_mentors", { p_admin_user_id: ctx.adminId }),
        ctx.rpc<{ student_user_id: string; login_id: string; team_name: string | null }[]>(
          "admin_list_assignable_students",
          { p_admin_user_id: ctx.adminId },
        ),
      ])
      const teamById = new Map((students ?? []).map((s) => [s.student_user_id, s]))
      return (mentors ?? []).map((m) => ({
        login_id: m.login_id,
        name: m.name,
        lab_venue: m.venue,
        domain_ids: m.domain_ids ?? [],
        teams: (m.assigned_student_ids ?? []).map((id) => {
          const s = teamById.get(id)
          return s ? { team: s.login_id, team_name: s.team_name } : { team: id, team_name: null }
        }),
      }))
    }),
  )

  server.registerTool(
    "assign_mentor",
    {
      title: "Assign a mentor to a team",
      description:
        "Make a mentor the team's mentor (replacing any current one). A mentor can have at most 2 teams. The team also takes the mentor's lab venue.",
      inputSchema: { team: z.string(), mentor_login_id: z.string() },
      annotations: WRITE,
    },
    run(ctx, async ({ team, mentor_login_id }) => {
      const [t, m] = await Promise.all([resolveTeam(ctx, team), resolveUser(ctx, mentor_login_id, ["mentor"])])
      await ctx.rpc("admin_assign_mentor", {
        p_admin_user_id: ctx.adminId,
        p_mentor_user_id: m.id,
        p_student_user_id: t.id,
      })
      ctx.purge(CACHE_TAGS.publicShowcase)
      return { ok: true, team: t.loginId, mentor: m.loginId }
    }),
  )

  server.registerTool(
    "unassign_mentor",
    {
      title: "Remove a team's mentor",
      description: "Leave the team without a mentor.",
      inputSchema: { team: z.string() },
      annotations: WRITE,
    },
    run(ctx, async ({ team }) => {
      const t = await resolveTeam(ctx, team)
      await ctx.rpc("admin_unassign_mentor", { p_admin_user_id: ctx.adminId, p_student_user_id: t.id })
      ctx.purge(CACHE_TAGS.publicShowcase)
      return { ok: true, team: t.loginId }
    }),
  )
}
