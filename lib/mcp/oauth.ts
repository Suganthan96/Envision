import { createHash } from "node:crypto"
import { SignJWT, jwtVerify, type JWTPayload } from "jose"

/**
 * Stateless OAuth 2.1 for the admin MCP server — the "paste the URL, log in,
 * click Allow" flow MCP clients (VS Code, Claude, Cursor…) run on their own.
 *
 * Nothing is stored: the registered client, the one-time code and the tokens
 * are all JWTs signed with a key derived from SESSION_SECRET. The derived key
 * means none of these can ever pass as a site session cookie (or vice versa).
 * Rotating SESSION_SECRET signs every agent out.
 */
const ISSUER = "envision-mcp"

function key() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("Missing SESSION_SECRET environment variable")
  return createHash("sha256").update(`${secret}|envision-mcp-oauth`).digest()
}

const sha = (s: string) => createHash("sha256").update(s).digest("base64url")

type Kind = "client" | "code" | "access" | "refresh"

async function sign(kind: Kind, claims: JWTPayload, expiresIn?: string) {
  const jwt = new SignJWT({ ...claims, typ: kind })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
  if (expiresIn) jwt.setExpirationTime(expiresIn)
  return jwt.sign(key())
}

async function verify<T extends JWTPayload>(kind: Kind, token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER })
    return payload.typ === kind ? (payload as T) : null
  } catch {
    return null
  }
}

export const ACCESS_TTL_SECONDS = 24 * 60 * 60

// ---------- clients (RFC 7591 dynamic registration) ----------

export interface OAuthClient {
  name: string
  redirectUris: string[]
}

/** Plain http only back to the agent's own machine; no script-ish schemes. */
export function validRedirectUri(uri: string) {
  if (typeof uri !== "string" || uri.length > 2000) return false
  let u: URL
  try {
    u = new URL(uri)
  } catch {
    return false
  }
  const scheme = u.protocol.replace(/:$/, "").toLowerCase()
  if (["javascript", "data", "vbscript", "file"].includes(scheme)) return false
  if (scheme === "http") return ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
  return true
}

export const registerClient = (client: OAuthClient) =>
  sign("client", { name: client.name.slice(0, 200), ruris: client.redirectUris })

export async function readClient(clientId: string): Promise<OAuthClient | null> {
  const p = await verify<{ name: string; ruris: string[] }>("client", clientId)
  return p ? { name: p.name, redirectUris: p.ruris } : null
}

// ---------- authorization code ----------

export const issueCode = (a: { adminId: string; clientId: string; redirectUri: string; codeChallenge: string }) =>
  sign("code", { sub: a.adminId, cid: sha(a.clientId), ruri: a.redirectUri, cc: a.codeChallenge }, "5m")

/** Checks the code against the client, redirect and PKCE verifier; returns the admin id. */
export async function redeemCode(code: string, clientId: string, redirectUri: string, verifier: string) {
  const p = await verify<{ sub: string; cid: string; ruri: string; cc: string }>("code", code)
  if (!p || p.cid !== sha(clientId) || p.ruri !== redirectUri) return null
  if (!verifier || sha(verifier) !== p.cc) return null
  return p.sub
}

// ---------- tokens ----------

export async function issueTokens(adminId: string, clientId: string) {
  const cid = sha(clientId)
  const [access, refresh] = await Promise.all([
    sign("access", { sub: adminId, cid }, `${ACCESS_TTL_SECONDS}s`),
    sign("refresh", { sub: adminId, cid }, "90d"),
  ])
  return {
    access_token: access,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refresh,
    scope: "admin",
  }
}

export async function readRefresh(token: string, clientId: string) {
  const p = await verify<{ sub: string; cid: string }>("refresh", token)
  return p && p.cid === sha(clientId) ? p.sub : null
}

export async function readAccess(token: string) {
  const p = await verify<{ sub: string }>("access", token)
  return p?.sub ?? null
}

// ---------- discovery ----------

/** Public origin of this deployment, from the request (works behind Vercel's proxy). */
export function originOf(request: Request) {
  const h = request.headers
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? new URL(request.url).host
  const proto = h.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")
  return `${proto}://${host}`
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-protocol-version",
}

export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS, ...extra },
  })

// ---------- authorize request ----------

export interface AuthorizeRequest {
  clientId: string
  client: OAuthClient
  redirectUri: string
  state: string
  codeChallenge: string
}

/**
 * Validates the parameters of an authorize request. `redirect` is set only
 * once the client and redirect_uri are trusted — before that, errors must be
 * shown on our own page rather than bounced to an unverified URL.
 */
export async function parseAuthorize(
  get: (k: string) => string | null | undefined,
): Promise<{ ok: AuthorizeRequest } | { error: string; redirect?: string }> {
  const clientId = get("client_id") ?? ""
  const redirectUri = get("redirect_uri") ?? ""
  const state = get("state") ?? ""
  const client = clientId ? await readClient(clientId) : null
  if (!client) return { error: "This app isn't registered. Remove the server from your editor and add it again." }
  if (!client.redirectUris.includes(redirectUri)) return { error: "The redirect address doesn't match this app." }

  const back = (error: string) => {
    const u = new URL(redirectUri)
    u.searchParams.set("error", error)
    if (state) u.searchParams.set("state", state)
    return u.toString()
  }
  if ((get("response_type") ?? "") !== "code") return { error: "Unsupported response_type.", redirect: back("unsupported_response_type") }
  const codeChallenge = get("code_challenge") ?? ""
  if (!codeChallenge || (get("code_challenge_method") ?? "") !== "S256") {
    return { error: "PKCE (S256) is required.", redirect: back("invalid_request") }
  }
  return { ok: { clientId, client, redirectUri, state, codeChallenge } }
}
