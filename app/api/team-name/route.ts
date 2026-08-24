import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createSessionToken, verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { getAppSettings } from "@/lib/app-settings"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  if (session.role !== "member") {
    return NextResponse.json({ error: "Only students have a team name." }, { status: 403 })
  }

  // Hiding the button isn't enough on its own -- enforce the admin
  // setting here too so the endpoint can't be called directly.
  const { teamNameEditOpen } = await getAppSettings()
  if (!teamNameEditOpen) {
    return NextResponse.json({ error: "Team name editing is currently closed." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const teamName = typeof body?.teamName === "string" ? body.teamName.trim() : ""

  if (!teamName) {
    return NextResponse.json({ error: "Team name is required." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("update_name", {
    p_user_id: session.userId,
    p_name: teamName,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to update team name." }, { status: 400 })
  }

  const newToken = await createSessionToken({ ...session, name: teamName })

  const response = NextResponse.json({ teamName })
  response.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  })

  return response
}
