import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/get-session"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const supabase = getSupabaseServerClient()

  const [countsResult, mineResult, capacitiesResult] = await Promise.all([
    supabase.rpc("get_domain_counts", { p_role: session.role }),
    supabase.rpc("get_my_domain_selections", { p_user_id: session.userId, p_role: session.role }),
    supabase.rpc("get_domain_capacities"),
  ])

  if (countsResult.error) {
    return NextResponse.json({ error: "Unable to load domain availability." }, { status: 500 })
  }

  const counts: Record<string, number> = {}
  for (const row of (countsResult.data ?? []) as { domain_id: string; selected_count: number }[]) {
    counts[row.domain_id] = row.selected_count
  }

  const mine = ((mineResult.data ?? []) as { domain_id: string }[]).map((row) => row.domain_id)

  const capacities: Record<string, number> = {}
  for (const row of (capacitiesResult.data ?? []) as {
    domain_id: string
    student_capacity: number
    mentor_capacity: number
  }[]) {
    capacities[row.domain_id] = session.role === "mentor" ? row.mentor_capacity : row.student_capacity
  }

  return NextResponse.json({ counts, mine, capacities })
}
