import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE, isEvaluator } from "@/lib/session"

/**
 * One faculty member's or juror's marks for one team, against whichever round
 * is active. The RPC re-checks that the team is actually assigned to them and
 * caps every mark at its criterion's maximum, so nothing here is taken on
 * trust from the client.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session || !isEvaluator(session.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const studentUserId = typeof body?.studentUserId === "string" ? body.studentUserId : ""
  if (!studentUserId) {
    return NextResponse.json({ error: "studentUserId is required." }, { status: 400 })
  }

  // Criteria left blank are simply absent; an empty object clears the sheet.
  const raw = body?.marks
  const marks: Record<string, number> = {}
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [label, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value === null || value === undefined || String(value).trim() === "") continue
      const mark = Number(value)
      if (!Number.isFinite(mark) || mark < 0 || mark > 1000) {
        return NextResponse.json({ error: `"${label}" must be a number.` }, { status: 400 })
      }
      marks[label] = Math.round(mark * 100) / 100
    }
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("evaluator_set_marks", {
    p_user_id: session.userId,
    p_student_user_id: studentUserId,
    p_marks: Object.keys(marks).length > 0 ? marks : null,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, total: data == null ? null : Number(data) })
}
