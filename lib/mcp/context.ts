import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { revalidateSharedData } from "@/lib/revalidate"
import type { CacheTag } from "@/lib/cache-tags"
import type { RubricRow } from "@/lib/judging"

/**
 * Shared plumbing for the admin MCP tools. Every tool acts as one admin
 * account (MCP_ADMIN_USER_ID) and goes through the same security-definer RPCs
 * the admin pages use, so the database enforces the same rules either way.
 * Tools take what a person would type — team numbers, login IDs, venue and
 * round names — and these helpers turn them into ids.
 */
export class ToolError extends Error {}

export interface McpContext {
  adminId: string
  rpc: <T = unknown>(name: string, params?: Record<string, unknown>) => Promise<T>
  purge: (...tags: CacheTag[]) => void
}

export function createContext(adminId: string): McpContext {
  const supabase = getSupabaseServerClient()
  return {
    adminId,
    async rpc<T>(name: string, params: Record<string, unknown> = {}) {
      const { data, error } = await supabase.rpc(name, params)
      if (error) throw new ToolError(error.message)
      // The boolean RPCs report "nothing matched / refused" as false rather
      // than raising, which the admin routes also treat as a failure.
      if (data === false) throw new ToolError(`${name} made no change — the target wasn't found or the request was refused.`)
      return data as T
    },
    purge: (...tags) => tags.forEach((t) => revalidateSharedData(t)),
  }
}

/** Wraps a tool body: JSON result on success, a readable error otherwise. */
export function run<A>(
  ctx: McpContext,
  body: (args: A, ctx: McpContext) => Promise<unknown>,
): (args: A) => Promise<CallToolResult> {
  return async (args: A) => {
    try {
      const result = await body(args, ctx)
      return { content: [{ type: "text", text: JSON.stringify(result ?? { ok: true }, null, 2) }] }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return { isError: true, content: [{ type: "text", text: message }] }
    }
  }
}

// ---------- resolvers ----------

export interface ResolvedUser {
  id: string
  loginId: string
  role: "member" | "mentor" | "admin" | "faculty" | "jury"
}

export async function resolveUser(ctx: McpContext, loginId: string, expectRole?: ResolvedUser["role"][]) {
  const id = String(loginId ?? "").trim()
  if (!id) throw new ToolError("A login ID is required.")
  const rows = await ctx.rpc<{ user_id: string; role: ResolvedUser["role"] }[]>("admin_lookup_user", {
    p_admin_user_id: ctx.adminId,
    p_login_id: id,
  })
  const row = Array.isArray(rows) ? rows[0] : null
  if (!row) throw new ToolError(`No account with login ID "${id}".`)
  if (expectRole && !expectRole.includes(row.role)) {
    throw new ToolError(`"${id}" is a ${row.role} account, not ${expectRole.join(" / ")}.`)
  }
  return { id: row.user_id, loginId: id, role: row.role } satisfies ResolvedUser
}

/** Teams sign in with their team number, so a team is its login ID. */
export const resolveTeam = (ctx: McpContext, team: string | number) => resolveUser(ctx, String(team), ["member"])

export interface Round {
  id: string
  name: string
  rubric: RubricRow[]
  is_active: boolean
  sort_order: number
  evaluation_count: number
  scores_published: boolean
}

export async function listRounds(ctx: McpContext): Promise<Round[]> {
  const rows = await ctx.rpc<Round[]>("admin_list_rubric_presets", { p_admin_user_id: ctx.adminId })
  return (rows ?? []).map((r) => ({ ...r, evaluation_count: Number(r.evaluation_count ?? 0) }))
}

/** A round by id, by name (case-insensitive), or "active" for the live one. */
export async function resolveRound(ctx: McpContext, round: string): Promise<Round> {
  const key = String(round ?? "").trim()
  if (!key) throw new ToolError("A round is required.")
  const rounds = await listRounds(ctx)
  const found =
    key.toLowerCase() === "active"
      ? rounds.find((r) => r.is_active)
      : (rounds.find((r) => r.id === key) ?? rounds.find((r) => r.name.toLowerCase() === key.toLowerCase()))
  if (!found) {
    throw new ToolError(`No round "${key}". Rounds: ${rounds.map((r) => r.name).join(", ") || "none"}.`)
  }
  return found
}

export interface JudgingVenueRow {
  id: string
  name: string
  kind: "judging" | "waiting"
  sort_order: number
}

export async function listJudgingVenues(ctx: McpContext, kind: "judging" | "waiting") {
  return (
    (await ctx.rpc<JudgingVenueRow[]>("admin_list_judging_venues", { p_admin_user_id: ctx.adminId, p_kind: kind })) ??
    []
  )
}

export async function resolveJudgingVenue(ctx: McpContext, venue: string, kind: "judging" | "waiting") {
  const key = String(venue ?? "").trim()
  const venues = await listJudgingVenues(ctx, kind)
  const found = venues.find((v) => v.id === key) ?? venues.find((v) => v.name.toLowerCase() === key.toLowerCase())
  if (!found) {
    throw new ToolError(
      `No ${kind} venue "${key}". ${kind} venues: ${venues.map((v) => v.name).join(", ") || "none"}.`,
    )
  }
  return found
}

export interface DomainRow {
  id: string
  title: string
  description: string
  icon: string
  sdgs: number[]
  sort_order: number
}

export async function resolveDomain(ctx: McpContext, domain: string) {
  const key = String(domain ?? "").trim().toLowerCase()
  const domains = (await ctx.rpc<DomainRow[]>("get_domains")) ?? []
  const found = domains.find((d) => d.id.toLowerCase() === key) ?? domains.find((d) => d.title.toLowerCase() === key)
  if (!found) throw new ToolError(`No domain "${domain}". Domains: ${domains.map((d) => d.title).join(", ")}.`)
  return found
}

/**
 * Checks marks against a round's rubric: every label must be a criterion of
 * that round and within its maximum. Blank / null values are dropped, which is
 * how a criterion is left unmarked.
 */
export function cleanMarks(rubric: RubricRow[], marks: Record<string, number | null | undefined>) {
  const out: Record<string, number> = {}
  for (const [label, raw] of Object.entries(marks ?? {})) {
    if (raw === null || raw === undefined) continue
    const row = rubric.find((r) => r.label === label)
    if (!row) {
      throw new ToolError(`"${label}" is not a criterion of this round. Criteria: ${rubric.map((r) => r.label).join(", ")}.`)
    }
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0 || n > row.max) {
      throw new ToolError(`"${label}" must be between 0 and ${row.max}.`)
    }
    out[label] = Math.round(n * 100) / 100
  }
  return out
}
