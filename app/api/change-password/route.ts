import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createSessionToken, roleHome, verifySessionToken, SESSION_COOKIE } from "@/lib/session"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const oldPassword = typeof body?.oldPassword === "string" ? body.oldPassword : ""
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : ""
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const phone = typeof body?.phone === "string" ? body.phone.trim() : ""

  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "Both current and new password are required." }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 })
  }

  if (newPassword === oldPassword) {
    return NextResponse.json({ error: "New password must differ from the current password." }, { status: 400 })
  }

  if (session.role === "mentor" && !name) {
    return NextResponse.json({ error: "Your full name is required." }, { status: 400 })
  }

  if (session.role === "member" && !name) {
    return NextResponse.json({ error: "Your team name is required." }, { status: 400 })
  }

  if (session.role === "member" && !phone) {
    return NextResponse.json({ error: "A phone number for the team lead is required." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("change_password", {
    p_user_id: session.userId,
    p_old_password: oldPassword,
    p_new_password: newPassword,
    p_name: name || null,
    p_phone: phone || null,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 })
  }

  const newToken = await createSessionToken({
    ...session,
    mustChangePassword: false,
    name: name || session.name,
  })

  const response = NextResponse.json({ redirect: roleHome(session.role) })
  response.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  })

  return response
}
