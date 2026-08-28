import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { CACHE_TAGS, revalidateSharedData } from "@/lib/cache-tags"
import type { TimelinePhase } from "@/lib/timeline"

function isValidPhases(value: unknown): value is TimelinePhase[] {
  if (!Array.isArray(value)) return false
  return value.every(
    (phase) =>
      phase &&
      typeof phase.id === "string" &&
      typeof phase.title === "string" &&
      Array.isArray(phase.entries) &&
      phase.entries.every(
        (entry: unknown) =>
          entry &&
          typeof (entry as Record<string, unknown>).id === "string" &&
          typeof (entry as Record<string, unknown>).label === "string" &&
          typeof (entry as Record<string, unknown>).title === "string" &&
          typeof (entry as Record<string, unknown>).resource === "string",
      ),
  )
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!isValidPhases(body?.phases)) {
    return NextResponse.json({ error: "Invalid timeline data." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("admin_set_timeline", {
    p_admin_user_id: session.userId,
    p_phases: body.phases,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to save the timeline." }, { status: 400 })
  }

  revalidateSharedData(CACHE_TAGS.timeline)
  return NextResponse.json({ ok: true })
}
