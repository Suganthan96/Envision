import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createSessionToken, SESSION_COOKIE, verifySessionToken } from "@/lib/session"

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  if (session.role !== "member") {
    return NextResponse.json({ error: "Not applicable to this account." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("update_team_lead_email", {
    p_user_id: session.userId,
    p_email: email,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to save the email address." }, { status: 400 })
  }

  const newToken = await createSessionToken({
    ...session,
    needsEmail: false,
  })

  const response = NextResponse.json({ redirect: "/member" })
  response.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  })

  return response
}
