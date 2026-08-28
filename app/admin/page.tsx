import { AdminNav } from "@/components/admin-nav"
import { AdminUserTable, type AppUserRow } from "@/components/admin-user-table"
import { getSession } from "@/lib/get-session"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { AdminHeader } from "@/components/admin-header"

export default async function AdminPage() {
  const session = await getSession()

  let users: AppUserRow[] = []
  if (session) {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("admin_list_users", { p_admin_user_id: session.userId })
    users = (data as AppUserRow[] | null) ?? []
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Welcome, <span className="text-gold-gradient">Administrator</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Reset a forgotten password below. The account will be required to set a new password at their next
          sign-in.
        </p>

        <AdminUserTable users={users} />
      </div>
    </main>
  )
}
