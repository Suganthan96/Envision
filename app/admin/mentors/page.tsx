import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { DomainSelectionsTable, type SelectionRow } from "@/components/domain-selections-table"
import { getSession } from "@/lib/get-session"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export default async function AdminMentorsPage() {
  const session = await getSession()

  let rows: SelectionRow[] = []
  if (session) {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("admin_list_domain_selections", { p_admin_user_id: session.userId })

    const grouped = new Map<string, string[]>()
    for (const row of (data ?? []) as { login_id: string; role: string; domain_id: string }[]) {
      if (row.role !== "mentor") continue
      const existing = grouped.get(row.login_id) ?? []
      existing.push(row.domain_id)
      grouped.set(row.login_id, existing)
    }
    rows = Array.from(grouped.entries()).map(([loginId, domainIds]) => ({ loginId, domainIds }))
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-5xl mx-auto">
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
          <span className="text-primary text-sm uppercase tracking-wider border-b border-primary pb-1">
            Mentor Selections
          </span>
          <Link
            href="/admin/students"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Student Selections
          </Link>
        </div>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Mentor <span className="text-gold-gradient">Domain Selections</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Every mentor and the domain(s) they have chosen to guide this cycle.
        </p>

        <DomainSelectionsTable rows={rows} emptyLabel="No mentors have selected a domain yet." />
      </div>
    </main>
  )
}
