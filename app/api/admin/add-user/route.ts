import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const loginId = typeof body?.loginId === "string" ? body.loginId.trim() : ""
  // Faculty and external jury are evaluator logins; admin is never created here.
  const ROLES = ["member", "mentor", "faculty", "jury"]
  const role = typeof body?.role === "string" && ROLES.includes(body.role) ? body.role : ""
  const password = typeof body?.password === "string" && body.password.length > 0 ? body.password : "licet@123"
  // Evaluators are people rather than team numbers, so the add form collects a
  // name for them, and their judging venues in the same step.
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const venueIds = Array.isArray(body?.venueIds) ? body.venueIds.map(String) : []

  if (!loginId) {
    return NextResponse.json({ error: "A login ID is required." }, { status: 400 })
  }
  if (!role) {
    return NextResponse.json(
      { error: "role must be one of member, mentor, faculty, jury." },
      { status: 400 },
    )
  }

  const supabase = getSupabaseServerClient()
  const { data: newUserId, error } = await supabase.rpc("admin_add_user", {
    p_admin_user_id: session.userId,
    p_login_id: loginId,
    p_role: role,
    p_password: password,
    p_name: name || null,
  })

  if (error || !newUserId) {
    return NextResponse.json({ error: error?.message ?? "Unable to add user." }, { status: 400 })
  }

  if (venueIds.length > 0 && (role === "faculty" || role === "jury")) {
    const { error: venueError } = await supabase.rpc("admin_set_evaluator_venues", {
      p_admin_user_id: session.userId,
      p_evaluator_user_id: newUserId,
      p_venue_ids: venueIds,
    })
    // The account exists either way — report the venue failure without
    // pretending the whole thing failed.
    if (venueError) {
      return NextResponse.json(
        { ok: true, warning: `Account created, but the venues could not be saved: ${venueError.message}` },
      )
    }
  }

  return NextResponse.json({ ok: true })
}
