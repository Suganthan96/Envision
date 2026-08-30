import { AdminUserTable, type AppUserRow } from "@/components/admin-user-table"
import { getSession } from "@/lib/get-session"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * The one slow part of /admin: the full user list RPC. Kept in its own
 * async component so the page shell (nav + heading) streams to the browser
 * immediately and this table swaps in under a <Suspense> when the query
 * returns, instead of the whole route blocking on it.
 */
export async function AdminUsersSection() {
  const session = await getSession()

  let users: AppUserRow[] = []
  if (session) {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("admin_list_users", { p_admin_user_id: session.userId })
    users = (data as AppUserRow[] | null) ?? []
  }

  return <AdminUserTable users={users} />
}
