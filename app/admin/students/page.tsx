import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { WebThreads } from "@/components/web-threads"
import { RoleSelectionsView, type RoleRow } from "@/components/role-selections-view"
import { getSession } from "@/lib/get-session"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export default async function AdminStudentsPage() {
  const session = await getSession()

  let students: RoleRow[] = []
  if (session) {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("admin_list_domain_selections", { p_admin_user_id: session.userId })

    const grouped = new Map<string, { name: string | null; domainIds: string[] }>()
    for (const row of (data ?? []) as { login_id: string; name: string | null; role: string; domain_id: string }[]) {
      if (row.role !== "member") continue
      const existing = grouped.get(row.login_id) ?? { name: row.name, domainIds: [] }
      existing.domainIds.push(row.domain_id)
      grouped.set(row.login_id, existing)
    }
    students = Array.from(grouped.entries()).map(([loginId, { name, domainIds }]) => ({ loginId, name, domainIds }))
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <WebThreads fixed />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <div className="w-8 h-px bg-primary" />
            <span className="font-serif text-xl text-foreground">Envision</span>
          </div>
          <LogoutButton />
        </div>

        <div className="flex items-center gap-6 mb-8">
          <Link href="/admin" className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider">
            User Management
          </Link>
          <Link
            href="/admin/mentors"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Mentor Selections
          </Link>
          <span className="text-primary text-sm uppercase tracking-wider border-b border-primary pb-1">
            Student Selections
          </span>
        </div>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Student <span className="text-gold-gradient">Domain Selections</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Every student and the domain they have chosen to build their project in this cycle.
        </p>

        <RoleSelectionsView
          people={students}
          capacityPerDomain={6}
          personLabel="Student"
          personLabelPlural="students"
          emptyLabel="No students have selected a domain yet."
        />
      </div>
    </main>
  )
}
