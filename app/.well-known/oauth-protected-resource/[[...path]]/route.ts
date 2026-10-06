import { CORS, json, originOf } from "@/lib/mcp/oauth"

/** RFC 9728: tells an MCP client that /api/mcp signs in through this site. */
export function GET(request: Request) {
  const origin = originOf(request)
  return json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: ["admin"],
    bearer_methods_supported: ["header"],
    resource_name: "EnVision admin",
  })
}

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS })
