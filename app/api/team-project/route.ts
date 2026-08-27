import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session"

const MAX_PROBLEM_LENGTH = 1000
const MAX_SHORT_LENGTH = 300
const MAX_LONG_LENGTH = 4000

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  if (session.role !== "member") {
    return NextResponse.json({ error: "Only student teams have a project." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const problemStatement = typeof body?.problemStatement === "string" ? body.problemStatement.trim() : ""
  const solutionShort = typeof body?.solutionShort === "string" ? body.solutionShort.trim() : ""
  const solutionLong = typeof body?.solutionLong === "string" ? body.solutionLong.trim() : ""

  if (problemStatement.length > MAX_PROBLEM_LENGTH) {
    return NextResponse.json(
      { error: `Problem statement must be ${MAX_PROBLEM_LENGTH} characters or fewer.` },
      { status: 400 },
    )
  }
  if (solutionShort.length > MAX_SHORT_LENGTH) {
    return NextResponse.json(
      { error: `Solution summary must be ${MAX_SHORT_LENGTH} characters or fewer.` },
      { status: 400 },
    )
  }
  if (solutionLong.length > MAX_LONG_LENGTH) {
    return NextResponse.json(
      { error: `Solution write-up must be ${MAX_LONG_LENGTH} characters or fewer.` },
      { status: 400 },
    )
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc("update_team_project", {
    p_user_id: session.userId,
    p_problem_statement: problemStatement || null,
    p_solution_short: solutionShort || null,
    p_solution_long: solutionLong || null,
  })

  if (error || data !== true) {
    return NextResponse.json({ error: "Unable to save your project." }, { status: 400 })
  }

  return NextResponse.json({
    problemStatement: problemStatement || null,
    solutionShort: solutionShort || null,
    solutionLong: solutionLong || null,
  })
}
