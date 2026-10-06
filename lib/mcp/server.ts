import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { createContext } from "@/lib/mcp/context"
import { APP_GUIDE } from "@/lib/mcp/guide"
import { registerPeopleTools } from "@/lib/mcp/tools/people"
import { registerProgramTools } from "@/lib/mcp/tools/program"
import { registerJudgingTools } from "@/lib/mcp/tools/judging"

const INSTRUCTIONS = `Admin tools for the EnVision 2026 portal (envisionlicet.vercel.app) — everything the /admin pages can do.

How the programme is modelled:
- Teams are accounts with role "member"; a team's login ID is its team number ("4", "57").
- Mentors sign in with a 12-digit registration number; each mentors at most 2 teams.
- Faculty and jury accounts are evaluators. Each covers judging venues (and optionally extra teams) and marks the live round on /evaluate.
- Judging rounds ("rubric presets") each have their own criteria and their own scores. Exactly one round is live. A round can be shown on the team/mentor leaderboard; with two or more shown, teams are ranked by their average.
- A team's presentation (judging) and waiting venue is layered: its own assignment, else its mentor's, else its domain's.
- Lab venues are where teams sit during the programme, separate from judging venues.

Tools accept team numbers, login IDs, venue names, domain titles and round names (or "active" for the live round), so you rarely need ids. Call get_app_guide once to learn how the app works, then get_overview for the current state. Confirm with the user before delete_users, delete_round, delete_domain or replacing the whole timeline/guideline.`

/** A fresh server per request: the transport is stateless, so nothing is shared. */
export function createAdminMcpServer(adminId: string) {
  const server = new McpServer({ name: "envision-admin", version: "1.0.0" }, { instructions: INSTRUCTIONS })
  const ctx = createContext(adminId)

  // How the app works — as a tool (every client supports tools) and as a resource.
  server.registerTool(
    "get_app_guide",
    {
      title: "How EnVision works",
      description:
        "Read this first: the roles and portals, every admin page and its matching tools, how domains, mentors, venues, judging rounds, scores and the leaderboard fit together, and common jobs.",
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
  registerJudgingTools(server, ctx)
  registerPeopleTools(server, ctx)
  registerProgramTools(server, ctx)
  return server
}
