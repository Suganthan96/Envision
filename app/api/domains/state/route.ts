import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/get-session"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const supabase = getSupabaseServerClient()

  const [countsResult, mineResult] = await Promise.all([
    supabase.rpc("get_domain_counts"),
    supabase.rpc("get_my_domain_selection", { p_user_id: session.userId, p_role: session.role }),
  ])

  if (countsResult.error) {
    return NextResponse.json({ error: "Unable to load domain availability." }, { status: 500 })
  }

  const counts: Record<string, number> = {}
  for (const row of (countsResult.data ?? []) as { domain_id: string; selected_count: number }[]) {
    counts[row.domain_id] = row.selected_count
  }

  const mine = ((mineResult.data ?? [])[0] as { domain_id: string } | undefined)?.domain_id ?? null

  return NextResponse.json({ counts, mine })
}
