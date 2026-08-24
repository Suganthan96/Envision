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
  const userId = typeof body?.userId === "string" ? body.userId : ""
  const venue = body?.venue === "C20" || body?.venue === "G01" ? body.venue : body?.venue === null ? null : undefined

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 })
  }
  if (venue === undefined) {
    return NextResponse.json({ error: "venue must be 'C20', 'G01', or null." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_set_venue", {
    p_admin_user_id: session.userId,
    p_user_id: userId,
    p_venue: venue,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to set venue." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
