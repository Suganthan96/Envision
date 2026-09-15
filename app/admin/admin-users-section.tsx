import { AdminUserTable, type AppUserRow } from "@/components/admin-user-table"
import { getSession } from "@/lib/get-session"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getJudgingVenues } from "@/lib/judging"
import { getEvaluators } from "@/lib/evaluation"

/**
 * The one slow part of /admin: the full user list RPC. Kept in its own
 * async component so the page shell (nav + heading) streams to the browser
 * immediately and this table swaps in under a <Suspense> when the query
 * returns, instead of the whole route blocking on it.
 */
export async function AdminUsersSection() {
  const session = await getSession()

  let users: AppUserRow[] = []
  // Judging venues and the evaluators' current rooms ride along so faculty and
  // jury logins can be given their venues right here, at creation or later.
  let venues: { id: string; name: string }[] = []
  let venuesByLogin: Record<string, string[]> = {}

  if (session) {
    const supabase = getSupabaseServerClient()
    const [{ data }, judgingVenues, evaluators] = await Promise.all([
      supabase.rpc("admin_list_users", { p_admin_user_id: session.userId }),
      getJudgingVenues(session.userId, "judging"),
      getEvaluators(session.userId),
    ])
    users = (data as AppUserRow[] | null) ?? []
    venues = judgingVenues.map((v) => ({ id: v.id, name: v.name }))
    venuesByLogin = Object.fromEntries(evaluators.map((e) => [e.loginId, e.venueIds]))
  }

  return <AdminUserTable users={users} venues={venues} venuesByLogin={venuesByLogin} />
}
