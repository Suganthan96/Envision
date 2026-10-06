import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { run, resolveDomain, resolveUser, ToolError, type DomainRow, type McpContext } from "@/lib/mcp/context"

const READ = { readOnlyHint: true, openWorldHint: false } as const
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const

const ICONS = [
  "water-energy",
  "home",
  "campus",
  "city",
  "agriculture",
  "health",
  "waste",
  "ai-social",
  "climate",
  "inclusive",
] as const

const SETTINGS = {
  student_domain_view: { rpc: "admin_set_domain_selection_open", role: "member", param: "p_open" },
  student_domain_select: { rpc: "admin_set_selection_enabled", role: "member", param: "p_enabled" },
  mentor_domain_view: { rpc: "admin_set_domain_selection_open", role: "mentor", param: "p_open" },
  mentor_domain_select: { rpc: "admin_set_selection_enabled", role: "mentor", param: "p_enabled" },
  team_name_edit: { rpc: "admin_set_team_name_edit_open", role: null, param: "p_open" },
} as const

const timelineEntry = z.object({
  id: z.string(),
  label: z.string().describe("e.g. 'Day 1' or 'Session 3'"),
  date: z.string().optional(),
  title: z.string(),
  resource: z.string().describe("Speaker / resource person"),
  venue: z.string().optional(),
  hasFeedbackForm: z.boolean().optional(),
})
const timelinePhase = z.object({ id: z.string(), title: z.string(), entries: z.array(timelineEntry) })

const guidelineSlide = z.object({
  id: z.string(),
  kind: z.enum(["text", "image"]),
  title: z.string().min(1),
  body: z.string().nullable(),
  imageUrl: z.string().nullable(),
})

export function registerProgramTools(server: McpServer, ctx: McpContext) {
  // ---------------- domains (themes) ----------------
  server.registerTool(
    "list_domains",
    {
      title: "List domains (themes)",
      description:
        "Every domain / problem theme with its id, description, icon, SDGs, how many teams and mentors chose it, and its capacities.",
      inputSchema: {},
      annotations: READ,
    },
    run(ctx, async () => {
      const [domains, caps, students, mentors] = await Promise.all([
        ctx.rpc<DomainRow[]>("get_domains"),
        ctx.rpc<{ domain_id: string; student_capacity: number; mentor_capacity: number }[]>("get_domain_capacities"),
        ctx.rpc<{ domain_id: string; selected_count: number }[]>("get_domain_counts", { p_role: "member" }),
        ctx.rpc<{ domain_id: string; selected_count: number }[]>("get_domain_counts", { p_role: "mentor" }),
      ])
      const count = (rows: typeof students, id: string) => Number(rows?.find((r) => r.domain_id === id)?.selected_count ?? 0)
      return (domains ?? []).map((d) => {
        const c = caps?.find((x) => x.domain_id === d.id)
        return {
          id: d.id,
          title: d.title,
          description: d.description,
          icon: d.icon,
          sdgs: d.sdgs,
          teams_chosen: count(students, d.id),
          team_capacity: c?.student_capacity ?? null,
          mentors_chosen: count(mentors, d.id),
          mentor_capacity: c?.mentor_capacity ?? null,
        }
      })
    }),
  )

  server.registerTool(
    "add_domain",
    {
      title: "Add a domain",
      description: "Create a new domain / problem theme.",
      inputSchema: {
        title: z.string().min(1),
        description: z.string().default(""),
        icon: z.enum(ICONS),
        sdgs: z.array(z.number().int().min(1).max(17)).default([]),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ title, description, icon, sdgs }) => {
      const id = await ctx.rpc<string>("admin_add_domain", {
        p_admin_user_id: ctx.adminId,
        p_title: title.trim(),
        p_description: description.trim(),
        p_icon: icon,
        p_sdgs: sdgs,
      })
      ctx.purge(CACHE_TAGS.domains)
      return { ok: true, id }
    }),
  )

  server.registerTool(
    "update_domain",
    {
      title: "Edit a domain",
      description: "Change a domain's title, description, icon or SDGs. Fields you leave out keep their current value.",
      inputSchema: {
        domain: z.string().describe("Domain id or title"),
        title: z.string().optional(),
        description: z.string().optional(),
        icon: z.enum(ICONS).optional(),
        sdgs: z.array(z.number().int().min(1).max(17)).optional(),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ domain, title, description, icon, sdgs }) => {
      const d = await resolveDomain(ctx, domain)
      await ctx.rpc("admin_update_domain", {
        p_admin_user_id: ctx.adminId,
        p_id: d.id,
        p_title: (title ?? d.title).trim(),
        p_description: (description ?? d.description ?? "").trim(),
        p_icon: icon ?? d.icon,
        p_sdgs: sdgs ?? d.sdgs ?? [],
      })
      ctx.purge(CACHE_TAGS.domains)
      return { ok: true, id: d.id }
    }),
  )

  server.registerTool(
    "delete_domain",
    {
      title: "Delete a domain",
      description: "Remove a domain / theme. Check with the user first if any team or mentor has chosen it.",
      inputSchema: { domain: z.string().describe("Domain id or title") },
      annotations: DESTRUCTIVE,
    },
    run(ctx, async ({ domain }) => {
      const d = await resolveDomain(ctx, domain)
      await ctx.rpc("admin_delete_domain", { p_admin_user_id: ctx.adminId, p_id: d.id })
      ctx.purge(CACHE_TAGS.domains)
      return { ok: true, deleted: d.title }
    }),
  )

  server.registerTool(
    "set_domain_capacity",
    {
      title: "Set a domain's capacity",
      description: "How many teams (role 'member') or mentors can pick this domain.",
      inputSchema: {
        domain: z.string().describe("Domain id or title"),
        role: z.enum(["member", "mentor"]),
        capacity: z.number().int().min(0),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ domain, role, capacity }) => {
      const d = await resolveDomain(ctx, domain)
      await ctx.rpc("admin_set_domain_capacity", {
        p_admin_user_id: ctx.adminId,
        p_role: role,
        p_domain_id: d.id,
        p_capacity: capacity,
      })
      ctx.purge(CACHE_TAGS.domainCapacities)
      return { ok: true, domain: d.title, role, capacity }
    }),
  )

  server.registerTool(
    "list_domain_selections",
    {
      title: "Domain selections",
      description: "Who picked which domain (with contact details), plus who still hasn't picked one.",
      inputSchema: { role: z.enum(["member", "mentor"]).optional() },
      annotations: READ,
    },
    run(ctx, async ({ role }) => {
      const roles = role ? [role] : (["member", "mentor"] as const)
      const [selections, ...pending] = await Promise.all([
        ctx.rpc<{ login_id: string; name: string | null; role: string; domain_id: string; email: string | null; phone: string | null }[]>(
          "admin_list_domain_selections",
          { p_admin_user_id: ctx.adminId },
        ),
        ...roles.map((r) =>
          ctx.rpc<{ login_id: string; name: string | null }[]>("admin_list_pending_domain_selections", {
            p_admin_user_id: ctx.adminId,
            p_role: r,
          }),
        ),
      ])
      return {
        selections: (selections ?? []).filter((s) => !role || s.role === role),
        not_yet_selected: Object.fromEntries(roles.map((r, i) => [r, pending[i] ?? []])),
      }
    }),
  )

  // ---------------- portal settings ----------------
  server.registerTool(
    "get_settings",
    {
      title: "Portal settings",
      description: "Whether teams / mentors can view and pick domains, and whether teams can edit their team name.",
      inputSchema: {},
      annotations: READ,
    },
    run(ctx, async () => {
      const rows = await ctx.rpc<
        {
          student_domain_selection_open: boolean
          student_can_select: boolean
          mentor_domain_selection_open: boolean
          mentor_can_select: boolean
          team_name_edit_open: boolean
        }[]
      >("get_app_settings")
      const s = rows?.[0]
      return {
        student_domain_view: s?.student_domain_selection_open ?? false,
        student_domain_select: s?.student_can_select ?? false,
        mentor_domain_view: s?.mentor_domain_selection_open ?? false,
        mentor_domain_select: s?.mentor_can_select ?? false,
        team_name_edit: s?.team_name_edit_open ?? false,
      }
    }),
  )

  server.registerTool(
    "set_setting",
    {
      title: "Turn a portal setting on or off",
      description:
        "student_domain_view / mentor_domain_view: the Domains page is open. student_domain_select / mentor_domain_select: picking is allowed. team_name_edit: teams can rename themselves.",
      inputSchema: { setting: z.enum(Object.keys(SETTINGS) as [keyof typeof SETTINGS]), enabled: z.boolean() },
      annotations: WRITE,
    },
    run(ctx, async ({ setting, enabled }) => {
      const s = SETTINGS[setting]
      await ctx.rpc(s.rpc, {
        p_admin_user_id: ctx.adminId,
        ...(s.role ? { p_role: s.role } : {}),
        [s.param]: enabled,
      })
      ctx.purge(CACHE_TAGS.appSettings)
      return { ok: true, setting, enabled }
    }),
  )

  // ---------------- timeline + feedback links ----------------
  server.registerTool(
    "get_timeline",
    {
      title: "Programme timeline",
      description: "The phases and sessions shown on every portal's Timeline page, with each session's feedback-form link.",
      inputSchema: {},
      annotations: READ,
    },
    run(ctx, async () => {
      const [phases, links] = await Promise.all([
        ctx.rpc<unknown>("get_timeline"),
        ctx.rpc<{ entry_id: string; url: string | null }[]>("get_feedback_links"),
      ])
      return { phases, feedback_links: Object.fromEntries((links ?? []).map((l) => [l.entry_id, l.url])) }
    }),
  )

  server.registerTool(
    "set_timeline",
    {
      title: "Replace the timeline",
      description:
        "Saves the WHOLE timeline — call get_timeline first and send back the full edited list of phases, or sessions will be lost.",
      inputSchema: { phases: z.array(timelinePhase) },
      annotations: WRITE,
    },
    run(ctx, async ({ phases }) => {
      await ctx.rpc("admin_set_timeline", { p_admin_user_id: ctx.adminId, p_phases: phases })
      ctx.purge(CACHE_TAGS.timeline)
      return { ok: true, phases: phases.length }
    }),
  )

  server.registerTool(
    "set_feedback_link",
    {
      title: "Set a session's feedback form",
      description: "Attach (or with an empty url, remove) the feedback-form link for a timeline session, by its entry id.",
      inputSchema: { entry_id: z.string(), url: z.string() },
      annotations: WRITE,
    },
    run(ctx, async ({ entry_id, url }) => {
      if (url && !/^https?:\/\//i.test(url)) throw new ToolError("URL must start with http:// or https://")
      await ctx.rpc("admin_set_feedback_link", { p_admin_user_id: ctx.adminId, p_entry_id: entry_id, p_url: url })
      ctx.purge(CACHE_TAGS.feedbackLinks)
      return { ok: true }
    }),
  )

  // ---------------- guidelines ----------------
  server.registerTool(
    "get_guideline",
    {
      title: "Project guideline",
      description: "The guideline title and slides shown to teams and mentors, and the name of the attached file if any.",
      inputSchema: {},
      annotations: READ,
    },
    run(ctx, async () => {
      const rows = await ctx.rpc<{ title: string; slides: unknown; file_name: string | null }[]>("get_project_guideline")
      return rows?.[0] ?? null
    }),
  )

  server.registerTool(
    "set_guideline",
    {
      title: "Replace the project guideline",
      description:
        "Saves the guideline title and the WHOLE slide list — call get_guideline first and send back every slide. Image slides take an image URL in imageUrl.",
      inputSchema: { title: z.string().min(1), slides: z.array(guidelineSlide) },
      annotations: WRITE,
    },
    run(ctx, async ({ title, slides }) => {
      await ctx.rpc("admin_set_project_guideline", {
        p_admin_user_id: ctx.adminId,
        p_title: title.trim(),
        p_slides: slides,
      })
      ctx.purge(CACHE_TAGS.projectGuideline)
      return { ok: true, slides: slides.length }
    }),
  )

  // ---------------- lab venues (where teams sit) ----------------
  server.registerTool(
    "list_lab_venues",
    {
      title: "Lab venues",
      description:
        "The lab rooms teams work in during the programme (separate from judging venues), with capacity and how many teams are in each.",
      inputSchema: {},
      annotations: READ,
    },
    run(ctx, async () => ctx.rpc("get_venues")),
  )

  server.registerTool(
    "manage_lab_venue",
    {
      title: "Add, resize or remove a lab venue",
      description: "action 'add' (needs team_capacity), 'set_capacity' (needs team_capacity) or 'remove'.",
      inputSchema: {
        action: z.enum(["add", "set_capacity", "remove"]),
        code: z.string().min(1).describe("Room code, e.g. 'A11'"),
        team_capacity: z.number().int().min(0).optional(),
      },
      annotations: WRITE,
    },
    run(ctx, async ({ action, code, team_capacity }) => {
      const base = { p_admin_user_id: ctx.adminId, p_code: code.trim() }
      if (action === "remove") {
        await ctx.rpc("admin_remove_venue", base)
      } else {
        if (team_capacity === undefined) throw new ToolError("team_capacity is required.")
        await ctx.rpc(action === "add" ? "admin_add_venue" : "admin_set_venue_capacity", {
          ...base,
          p_team_capacity: team_capacity,
        })
      }
      ctx.purge(CACHE_TAGS.venues)
      return { ok: true, action, code }
    }),
  )

  server.registerTool(
    "set_user_lab_venue",
    {
      title: "Move a team or mentor to a lab venue",
      description: "Set (or with venue null, clear) the lab room for a team or mentor.",
      inputSchema: { login_id: z.string(), venue: z.string().nullable() },
      annotations: WRITE,
    },
    run(ctx, async ({ login_id, venue }) => {
      const u = await resolveUser(ctx, login_id, ["member", "mentor"])
      await ctx.rpc("admin_set_venue", { p_admin_user_id: ctx.adminId, p_user_id: u.id, p_venue: venue })
      ctx.purge(CACHE_TAGS.venues)
      return { ok: true, login_id: u.loginId, venue }
    }),
  )
}
