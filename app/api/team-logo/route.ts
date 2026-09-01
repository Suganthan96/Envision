import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"

const MAX_LOGO_LENGTH = 2_000_000

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  if (session.role !== "member") {
    return NextResponse.json({ error: "Only student teams have a logo." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl.trim() : ""

  if (logoUrl && !logoUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Logo must be an image." }, { status: 400 })
  }
  if (logoUrl.length > MAX_LOGO_LENGTH) {
    return NextResponse.json({ error: "Logo is too large." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("update_team_logo", {
    p_user_id: session.userId,
    p_logo_url: logoUrl || null,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to save the team logo." }, { status: 400 })
  }

  return NextResponse.json({ logoUrl: logoUrl || null })
}
