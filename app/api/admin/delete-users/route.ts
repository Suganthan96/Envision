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
  const loginIds = Array.isArray(body?.loginIds)
    ? body.loginIds.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
    : []

  if (loginIds.length === 0) {
    return NextResponse.json({ error: "At least one login ID is required." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_delete_users", {
    p_admin_user_id: session.userId,
    p_target_login_ids: loginIds,
  })

  if (error) {
    return NextResponse.json({ error: "Unable to delete accounts." }, { status: 400 })
  }

  // A deleted team or mentor must disappear from the public listings at once.
  revalidateSharedData(CACHE_TAGS.publicShowcase)

  return NextResponse.json({ ok: true, deletedCount: data ?? 0 })
}
