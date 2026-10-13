import { z } from "zod"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { createContext } from "@/lib/mcp/context"
import { APP_GUIDE } from "@/lib/mcp/guide"
import { getEditions, withEdition } from "@/lib/edition"
import { registerPeopleTools } from "@/lib/mcp/tools/people"
import { registerProgramTools } from "@/lib/mcp/tools/program"
import { registerJudgingTools } from "@/lib/mcp/tools/judging"
import { registerExtraTools } from "@/lib/mcp/tools/extras"

const INSTRUCTIONS = `Admin tools for the EnVision portal (envisionlicet.vercel.app) — everything the /admin pages can do.

How the programme is modelled:
- The programme runs in years (editions) such as 2026-27. Each year keeps its own teams, mentors, rounds, scores, rooms, timeline and guidelines side by side; nothing is deleted when a new year starts. Every tool works on the current year unless you pass \`year\` (e.g. "2026-27"); list_years shows them all.
- Teams are accounts with role "member"; a team's login ID is its team number ("4", "57").
- Mentors sign in with a 12-digit registration number starting 3111; each mentors at most 2 teams.
- Faculty and jury accounts are evaluators. Each covers judging venues (and optionally extra teams) and marks the live round on /evaluate.
- Judging rounds ("rubric presets") each have their own criteria, scores and tie-break order. Exactly one round is live. A round can be shown on the team/mentor leaderboard; with two or more shown, teams are ranked by their average (a missing round counts as 0).
- A team's presentation (judging) and waiting venue is layered: its own assignment, else its mentor's, else its domain's.
- Lab venues are where teams sit during the programme, separate from judging venues.

Tools accept team numbers, login IDs, venue names, domain titles and round names (or "active" for the live round), so you rarely need ids. Call get_app_guide once to learn how the app works, then get_overview for the current state; search_manual answers "how do I …" questions about the website. Confirm with the user before delete_users, delete_round, delete_domain, set_current_year, start_year or replacing the whole timeline/guideline.`

const YEAR_ARG = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .optional()
  .describe('Programme year to work in, e.g. "2026-27". Omit for the current year.')

/**
 * Gives every tool registered after this an optional `year` argument and runs
 * the call inside that year, the same way an admin's year switcher does on
 * the website (lib/edition.ts). Without it, tools work on the current year.
 */
function withYearArgument(server: McpServer) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const register = server.registerTool.bind(server) as (...a: any[]) => unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(server as any).registerTool = (name: string, config: any, handler: (...a: any[]) => Promise<CallToolResult>) =>
    register(
      name,
      { ...config, inputSchema: { ...(config.inputSchema ?? {}), year: YEAR_ARG } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (args: any, extra: any) => {
        const { year, ...rest } = (args ?? {}) as { year?: string }
        if (!year) return handler(rest, extra)
        const years = await getEditions()
        if (!years.some((y) => y.id === year)) {
          return {
            isError: true,
            content: [{ type: "text", text: `No year ${year}. Years: ${years.map((y) => y.id).join(", ")}.` }],
          }
        }
        return withEdition(year, () => handler(rest, extra))
      },
    )
}

/** A fresh server per request: the transport is stateless, so nothing is shared. */
export function createAdminMcpServer(adminId: string) {
  const server = new McpServer({ name: "envision-admin", version: "1.1.0" }, { instructions: INSTRUCTIONS })
  const ctx = createContext(adminId)

  // How the app works — as a tool (every client supports tools) and as a resource.
  server.registerTool(
    "get_app_guide",
    {
      title: "How EnVision works",
      description:
        "Read this first: the roles and portals, programme years, every admin page and its matching tools, how domains, mentors, venues, judging rounds, scores and the leaderboard fit together, and common jobs.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => ({ content: [{ type: "text", text: APP_GUIDE }] }),
  )
  server.registerResource(
    "app-guide",
    "envision://guide",
    { title: "How EnVision works", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: APP_GUIDE }] }),
  )

  withYearArgument(server)
  registerJudgingTools(server, ctx)
  registerPeopleTools(server, ctx)
  registerProgramTools(server, ctx)
  registerExtraTools(server, ctx)
  return server
}
