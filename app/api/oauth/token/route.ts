import { CORS, issueTokens, json, readClient, readRefresh, redeemCode } from "@/lib/mcp/oauth"

const fail = (error: string, description: string) => json({ error, error_description: description }, 400)

/** Code + PKCE verifier → tokens, and refresh-token rotation. */
export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? ""
  const raw = type.includes("application/json")
    ? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
    : Object.fromEntries((await request.formData().catch(() => new FormData())).entries())
  const p = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "")

  const clientId = p("client_id")
  if (!clientId || !(await readClient(clientId))) return fail("invalid_client", "Unknown client_id.")

  if (p("grant_type") === "authorization_code") {
    const adminId = await redeemCode(p("code"), clientId, p("redirect_uri"), p("code_verifier"))
    if (!adminId) return fail("invalid_grant", "The code is invalid, expired, or the PKCE verifier doesn't match.")
    return json(await issueTokens(adminId, clientId))
  }

  if (p("grant_type") === "refresh_token") {
    const adminId = await readRefresh(p("refresh_token"), clientId)
    if (!adminId) return fail("invalid_grant", "The refresh token is invalid or expired — connect again.")
    return json(await issueTokens(adminId, clientId))
  }

  return fail("unsupported_grant_type", "Use authorization_code or refresh_token.")
}

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS })
