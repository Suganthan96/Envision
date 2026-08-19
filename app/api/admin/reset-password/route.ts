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
  const targetLoginId = typeof body?.targetLoginId === "string" ? body.targetLoginId.trim() : ""
  const newPassword = typeof body?.newPassword === "string" && body.newPassword.length > 0 ? body.newPassword : "licet@123"

  if (!targetLoginId) {
    return NextResponse.json({ error: "A login ID is required." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_reset_password", {
    p_admin_user_id: session.userId,
    p_target_login_id: targetLoginId,
    p_new_password: newPassword,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to reset password. Check the login ID." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
