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
  const action = body?.action
  const code = typeof body?.code === "string" ? body.code.trim() : ""
  const teamCapacity = typeof body?.teamCapacity === "number" ? body.teamCapacity : Number(body?.teamCapacity)

  if (!code) {
    return NextResponse.json({ error: "A venue code is required." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()

  if (action === "remove") {
    const { data, error } = await supabase.rpc("admin_remove_venue", {
      p_admin_user_id: session.userId,
      p_code: code,
    })
    if (error || data !== true) {
      return NextResponse.json({ error: "Unable to remove venue." }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  if (!Number.isInteger(teamCapacity) || teamCapacity < 0) {
    return NextResponse.json({ error: "Capacity must be a whole number ≥ 0." }, { status: 400 })
  }

  if (action === "setCapacity") {
    const { data, error } = await supabase.rpc("admin_set_venue_capacity", {
      p_admin_user_id: session.userId,
      p_code: code,
      p_team_capacity: teamCapacity,
    })
    if (error || data !== true) {
      return NextResponse.json({ error: "Unable to update capacity." }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === "add") {
    const { data, error } = await supabase.rpc("admin_add_venue", {
      p_admin_user_id: session.userId,
      p_code: code,
      p_team_capacity: teamCapacity,
    })
    if (error || data !== true) {
      return NextResponse.json({ error: error?.message ?? "Unable to add venue." }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 })
}
