import { NextRequest } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session"
import { issueCode, originOf, parseAuthorize } from "@/lib/mcp/oauth"

/** The Allow / Deny buttons on /oauth/authorize post here. */
export async function POST(request: NextRequest) {
  // Only our own consent page may approve.
  const origin = request.headers.get("origin")
  if (origin && origin !== originOf(request)) return new Response("Forbidden", { status: 403 })

  const form = await request.formData()
  const get = (k: string) => {
    const v = form.get(k)
    return typeof v === "string" ? v : null
  }
  const parsed = await parseAuthorize(get)
  if ("error" in parsed) {
    if (parsed.redirect) return Response.redirect(parsed.redirect, 303)
    return new Response(parsed.error, { status: 400 })
  }
  const { clientId, redirectUri, state, codeChallenge } = parsed.ok

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session || session.role !== "admin") return new Response("Sign in as an admin first.", { status: 401 })

  const target = new URL(redirectUri)
  if (state) target.searchParams.set("state", state)
  if (get("decision") !== "allow") {
    target.searchParams.set("error", "access_denied")
  } else {
    target.searchParams.set("code", await issueCode({ adminId: session.userId, clientId, redirectUri, codeChallenge }))
  }
  return Response.redirect(target.toString(), 303)
}
