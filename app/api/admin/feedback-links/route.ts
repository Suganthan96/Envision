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
  const entryId = typeof body?.entryId === "string" ? body.entryId : ""
  const url = typeof body?.url === "string" ? body.url : ""

  if (!entryId) {
    return NextResponse.json({ error: "entryId is required." }, { status: 400 })
  }

  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "URL must start with http:// or https://" }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_set_feedback_link", {
    p_admin_user_id: session.userId,
    p_entry_id: entryId,
    p_url: url,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to save the link." }, { status: 400 })
  }

  revalidateSharedData(CACHE_TAGS.feedbackLinks)
  return NextResponse.json({ ok: true })
}
