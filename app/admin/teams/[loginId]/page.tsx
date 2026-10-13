import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/get-session"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

/**
 * /admin/teams/17 → that team's admin profile, in the year being worked in.
 * Lets any list that only knows a team number link to its profile.
 */
export default async function AdminTeamByLoginPage({ params }: { params: Promise<{ loginId: string }> }) {
  const { loginId } = await params
  const session = await getSession()
  if (!session) notFound()

  const { data } = await getSupabaseServerClient().rpc("admin_lookup_user", {
    p_admin_user_id: session.userId,
    p_login_id: decodeURIComponent(loginId),
  })
  const row = (Array.isArray(data) ? data[0] : null) as { user_id: string; role: string } | null
  if (!row || row.role !== "member") notFound()
  redirect(`/admin/team-profiles/${row.user_id}`)
}
