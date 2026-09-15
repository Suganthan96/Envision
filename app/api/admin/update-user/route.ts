import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { MENTOR_ID_ERROR, isValidMentorId, looksLikeMentorId } from "@/lib/mentor-login-id"

/**
 * Edit one login's details from User Management. Fields left out of the body
 * are left alone; an empty string clears one. Role changes are refused by the
 * RPC for anything but swapping faculty <-> external jury.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const loginId = typeof body?.loginId === "string" ? body.loginId.trim() : ""
  if (!loginId) {
    return NextResponse.json({ error: "A login ID is required." }, { status: 400 })
  }

  const field = (v: unknown) => (typeof v === "string" ? v : null)
  const role = body?.role === "faculty" || body?.role === "jury" ? (body.role as string) : null

  // A rename is optional; sending the same ID back is a no-op. Everything else
  // keys off the account's uuid, so this only changes what they type to sign in.
  const newLoginId = typeof body?.newLoginId === "string" ? body.newLoginId.trim() : ""
  if (typeof body?.newLoginId === "string" && !newLoginId) {
    return NextResponse.json({ error: "A login ID cannot be blank." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()

  // app_users is behind RLS with no policies, so the anon key cannot select
  // from it — every read goes through a security-definer RPC.
  const lookup = async (id: string) => {
    const { data } = await supabase.rpc("admin_lookup_user", {
      p_admin_user_id: session.userId,
      p_login_id: id,
    })
    const row = (Array.isArray(data) ? data[0] : data) as
      | { user_id: string; role: string }
      | undefined
    return row ?? null
  }

  const target = await lookup(loginId)
  if (!target) {
    return NextResponse.json({ error: "That login no longer exists." }, { status: 400 })
  }

  // Mentors sign in with their registration number, and the login route
  // rejects a malformed one — so refuse to write a mentor into that state.
  if (newLoginId && newLoginId !== loginId) {
    if (
      (target.role === "mentor" || looksLikeMentorId(newLoginId)) &&
      !isValidMentorId(newLoginId)
    ) {
      return NextResponse.json({ error: MENTOR_ID_ERROR }, { status: 400 })
    }
  }
  const { error } = await supabase.rpc("admin_update_user", {
    p_admin_user_id: session.userId,
    p_login_id: loginId,
    p_name: field(body?.name),
    p_phone: field(body?.phone),
    p_email: field(body?.email),
    p_role: role,
    p_new_login_id: newLoginId || null,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Judging venues only mean anything for an evaluator. An empty array is a
  // real value here — it clears their rooms.
  // The role may have just been swapped, so decide from what was requested.
  const finalRole = role ?? target.role
  if (Array.isArray(body?.venueIds) && (finalRole === "faculty" || finalRole === "jury")) {
    const { error: venueError } = await supabase.rpc("admin_set_evaluator_venues", {
      p_admin_user_id: session.userId,
      p_evaluator_user_id: target.user_id,
      p_venue_ids: body.venueIds.map(String),
    })
    if (venueError) {
      return NextResponse.json({ error: venueError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}
