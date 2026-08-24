import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const studentUserId = typeof body?.studentUserId === "string" ? body.studentUserId : ""
  const mentorUserId = typeof body?.mentorUserId === "string" ? body.mentorUserId : null

  if (!studentUserId) {
    return NextResponse.json({ error: "studentUserId is required." }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()

  if (mentorUserId === null) {
    const { data, error } = await supabase.rpc("admin_unassign_mentor", {
      p_admin_user_id: session.userId,
      p_student_user_id: studentUserId,
    })

    if (error) {
      return NextResponse.json({ error: "Unable to unassign." }, { status: 400 })
    }
    return NextResponse.json({ ok: true, unassigned: data === true })
  }

  const { data, error } = await supabase.rpc("admin_assign_mentor", {
    p_admin_user_id: session.userId,
    p_mentor_user_id: mentorUserId,
    p_student_user_id: studentUserId,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: error?.message ?? "Unable to assign." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
