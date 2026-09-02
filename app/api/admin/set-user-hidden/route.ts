import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { revalidateSharedData } from "@/lib/revalidate"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const loginId = typeof body?.loginId === "string" ? body.loginId : ""
  const hidden = Boolean(body?.hidden)
  if (!loginId) {
    return NextResponse.json({ error: "loginId is required." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_set_user_hidden", {
    p_admin_user_id: session.userId,
    p_login_id: loginId,
    p_hidden: hidden,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: error?.message ?? "Could not update visibility." }, { status: 400 })
  }
  // Hiding someone is a visibility decision — it must take effect on the
  // public /showcase and /mentors listings immediately, not after their
  // 20–60s time-based cache happens to expire.
  revalidateSharedData(CACHE_TAGS.publicShowcase)

  return NextResponse.json({ ok: true, hidden })
}
