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
  const role = body?.role === "mentor" || body?.role === "member" ? body.role : ""
  const password = typeof body?.password === "string" && body.password.length > 0 ? body.password : "licet@123"

  if (!loginId) {
    return NextResponse.json({ error: "A login ID is required." }, { status: 400 })
  }
  if (!role) {
    return NextResponse.json({ error: "role must be 'mentor' or 'member'." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_add_user", {
    p_admin_user_id: session.userId,
    p_login_id: loginId,
    p_role: role,
    p_password: password,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: error?.message ?? "Unable to add user." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
