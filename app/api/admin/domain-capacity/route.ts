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
  const domainId = typeof body?.domainId === "string" ? body.domainId : ""
  const role = body?.role === "mentor" || body?.role === "member" ? body.role : ""
  const capacity = typeof body?.capacity === "number" ? body.capacity : Number(body?.capacity)

  if (!domainId) {
    return NextResponse.json({ error: "domainId is required." }, { status: 400 })
  }
  if (!role) {
    return NextResponse.json({ error: "role must be 'mentor' or 'member'." }, { status: 400 })
  }
  if (!Number.isInteger(capacity) || capacity < 0) {
    return NextResponse.json({ error: "capacity must be a whole number ≥ 0." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_set_domain_capacity", {
    p_admin_user_id: session.userId,
    p_role: role,
    p_domain_id: domainId,
    p_capacity: capacity,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to save capacity." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
