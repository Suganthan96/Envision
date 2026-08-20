import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createSessionToken, roleHome, SESSION_COOKIE, type Role } from "@/lib/session"
import { isAccountRateLimited, isIpRateLimited } from "@/lib/rate-limit"
import { MENTOR_ID_ERROR, isValidMentorId, looksLikeMentorId } from "@/lib/mentor-login-id"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const loginId = typeof body?.loginId === "string" ? body.loginId.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!loginId || !password) {
    return NextResponse.json({ error: "Login ID and password are required." }, { status: 400 })
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (isAccountRateLimited(loginId) || isIpRateLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 })
  }

  if (looksLikeMentorId(loginId) && !isValidMentorId(loginId)) {
    return NextResponse.json({ error: MENTOR_ID_ERROR }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("login", {
    p_login_id: loginId,
    p_password: password,
  })

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "Invalid login ID or password." }, { status: 401 })
  }

  const row = data[0] as { user_id: string; role: Role; must_change_password: boolean }

  const token = await createSessionToken({
    userId: row.user_id,
    loginId,
    role: row.role,
    mustChangePassword: row.must_change_password,
  })

  const response = NextResponse.json({
    redirect: row.must_change_password ? "/change-password" : roleHome(row.role),
  })

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  })

  return response
}
