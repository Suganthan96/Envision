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
  if (body?.role !== "mentor" && body?.role !== "member") {
    return NextResponse.json({ error: "role must be 'mentor' or 'member'." }, { status: 400 })
  }
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 })
  }
  if (body?.field !== "view" && body?.field !== "select") {
    return NextResponse.json({ error: "field must be 'view' or 'select'." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const rpcName = body.field === "view" ? "admin_set_domain_selection_open" : "admin_set_selection_enabled"
  const paramName = body.field === "view" ? "p_open" : "p_enabled"

  const { data, error } = await supabase.rpc(rpcName, {
    p_admin_user_id: session.userId,
    p_role: body.role,
    [paramName]: body.enabled,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to update settings." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
