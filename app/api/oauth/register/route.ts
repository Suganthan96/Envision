import { CORS, json, registerClient, validRedirectUri } from "@/lib/mcp/oauth"

/** RFC 7591 dynamic client registration — MCP clients call this on their own. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const redirectUris: unknown = body?.redirect_uris
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    redirectUris.length > 10 ||
    !redirectUris.every((u) => typeof u === "string" && validRedirectUri(u))
  ) {
    return json({ error: "invalid_redirect_uri", error_description: "Provide valid redirect_uris." }, 400)
  }
  const name = typeof body?.client_name === "string" && body.client_name.trim() ? body.client_name.trim() : "MCP client"
  const clientId = await registerClient({ name, redirectUris: redirectUris as string[] })
  return json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    201,
  )
}

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS })
