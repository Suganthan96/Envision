import { CORS, json, originOf } from "@/lib/mcp/oauth"

/** RFC 8414 metadata for the MCP sign-in. */
export function GET(request: Request) {
  const origin = originOf(request)
  return json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["admin"],
  })
}

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS })
