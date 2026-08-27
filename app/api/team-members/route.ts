import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"
import { DEPARTMENTS } from "@/lib/department"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  if (session.role !== "member") {
    return NextResponse.json({ error: "Only student teams have a roster." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const rawMembers = Array.isArray(body?.members) ? body.members : null

  if (!rawMembers || rawMembers.length === 0) {
    return NextResponse.json({ error: "Add at least one team member." }, { status: 400 })
  }
  if (rawMembers.length > 7) {
    return NextResponse.json({ error: "A team can have at most 7 members." }, { status: 400 })
  }

  const members: { name: string; email: string | null; department: string | null }[] = []
  for (const m of rawMembers) {
    const name = typeof m?.name === "string" ? m.name.trim() : ""
    const email = typeof m?.email === "string" ? m.email.trim() : ""
    const department = typeof m?.department === "string" ? m.department.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Every team member needs a name." }, { status: 400 })
    }
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: `"${email}" isn't a valid email address.` }, { status: 400 })
    }
    if (department && !DEPARTMENTS.includes(department as (typeof DEPARTMENTS)[number])) {
      return NextResponse.json({ error: `"${department}" isn't a valid department.` }, { status: 400 })
    }
    members.push({ name, email: email || null, department: department || null })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("set_team_members", {
    p_user_id: session.userId,
    p_members: members,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to save the team roster." }, { status: 400 })
  }

  return NextResponse.json({ members })
}
