import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/get-session"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const domainId = typeof body?.domainId === "string" ? body.domainId : ""

  if (!domainId) {
    return NextResponse.json({ error: "domainId is required." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("select_domain", {
    p_user_id: session.userId,
    p_login_id: session.loginId,
    p_role: session.role,
    p_domain_id: domainId,
  })

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "Unable to save your selection." }, { status: 500 })
  }

  const row = data[0] as { ok: boolean; message: string }

  if (!row.ok) {
    return NextResponse.json({ error: row.message }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
