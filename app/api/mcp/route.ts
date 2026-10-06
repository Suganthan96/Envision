import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { createAdminMcpServer } from "@/lib/mcp/server"
import { CORS, originOf, readAccess } from "@/lib/mcp/oauth"

/**
 * Remote MCP server for the admin portal (Streamable HTTP, stateless).
 *
 * Add https://<site>/api/mcp to any MCP client. With no token it answers 401
 * and points the client at /.well-known/oauth-protected-resource, so the
 * client opens a browser, the admin signs in and clicks Allow, and every call
 * after that carries a Bearer token that acts as that admin. Every tool goes
 * through the same admin RPCs as the /admin pages.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function unauthorized(request: Request) {
  const metadata = `${originOf(request)}/.well-known/oauth-protected-resource/api/mcp`
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "Sign in required." }, id: null }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${metadata}"`,
        ...CORS,
        "Access-Control-Expose-Headers": "WWW-Authenticate",
      },
    },
  )
}

async function handle(request: Request) {
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  const adminId = token ? await readAccess(token) : null
  if (!adminId) return unauthorized(request)

  const server = createAdminMcpServer(adminId)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  try {
    const res = await transport.handleRequest(request)
    for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v)
    return res
  } finally {
    // Stateless: the response is fully built (JSON mode), so tear down now.
    await transport.close().catch(() => {})
    await server.close().catch(() => {})
  }
}

export { handle as GET, handle as POST, handle as DELETE }
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS })
