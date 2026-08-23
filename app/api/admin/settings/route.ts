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
  if (typeof body?.domainSelectionOpen !== "boolean") {
    return NextResponse.json({ error: "domainSelectionOpen must be a boolean." }, { status: 400 })
  }
  if (body?.role !== "mentor" && body?.role !== "member") {
    return NextResponse.json({ error: "role must be 'mentor' or 'member'." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_set_domain_selection_open", {
    p_admin_user_id: session.userId,
    p_role: body.role,
    p_open: body.domainSelectionOpen,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to update settings." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
