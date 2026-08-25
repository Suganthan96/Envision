import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { RoleSelectionsView, type RoleRow } from "@/components/role-selections-view"
import { AdminSettingToggle } from "@/components/admin-setting-toggle"
import { PendingSelections, type PendingPerson } from "@/components/pending-selections"
import { DomainCapacityEditor, type DomainCapacityRow } from "@/components/domain-capacity-editor"
import { getSession } from "@/lib/get-session"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getAppSettings } from "@/lib/app-settings"
import { getDomains, type Domain } from "@/lib/domains"

export default async function AdminMentorsPage() {
  const session = await getSession()

  let mentors: RoleRow[] = []
  let pending: PendingPerson[] = []
  let capacityRows: DomainCapacityRow[] = []
  let capacities: Record<string, number> = {}
  let domains: Domain[] = []
  if (session) {
    const supabase = getSupabaseServerClient()
    const [{ data }, { data: pendingData }, { data: capacityData }, domainsResult] = await Promise.all([
      supabase.rpc("admin_list_domain_selections", { p_admin_user_id: session.userId }),
      supabase.rpc("admin_list_pending_domain_selections", { p_admin_user_id: session.userId, p_role: "mentor" }),
      supabase.rpc("get_domain_capacities"),
      getDomains(),
    ])
    domains = domainsResult

    const capacityData2 = (capacityData ?? []) as {
      domain_id: string
      student_capacity: number
      mentor_capacity: number
    }[]
    capacityRows = domains.map((d) => ({
      domainId: d.id,
      title: d.title,
      capacity: capacityData2.find((c) => c.domain_id === d.id)?.mentor_capacity ?? 7,
    }))
    capacities = Object.fromEntries(capacityRows.map((r) => [r.domainId, r.capacity]))

    const grouped = new Map<
      string,
      { name: string | null; phone: string | null; email: string | null; teamLeadName: string | null; domainIds: string[] }
    >()
    for (const row of (data ?? []) as {
      login_id: string
      name: string | null
      phone: string | null
      email: string | null
      team_lead_name: string | null
      role: string
      domain_id: string
    }[]) {
      if (row.role !== "mentor") continue
      const existing =
        grouped.get(row.login_id) ??
        { name: row.name, phone: row.phone, email: row.email, teamLeadName: row.team_lead_name, domainIds: [] }
      existing.domainIds.push(row.domain_id)
      grouped.set(row.login_id, existing)
    }
    mentors = Array.from(grouped.entries()).map(([loginId, { name, phone, email, teamLeadName, domainIds }]) => ({
      loginId,
      name,
      phone,
      email,
      teamLeadName,
      domainIds,
    }))
    pending = (
      (pendingData ?? []) as { login_id: string; name: string | null; phone: string | null; email: string | null }[]
    ).map((row) => ({
      loginId: row.login_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
    }))
  }
  const { mentorDomainSelectionOpen, mentorCanSelect } = await getAppSettings()

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <div className="w-8 h-px bg-primary" />
            <span className="font-serif text-xl text-foreground">Envision</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="inline" />
            <LogoutButton />
          </div>
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
          <Link
            href="/admin/matching"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Mentor Matching
          </Link>
          <Link
            href="/admin/timeline"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Timeline
          </Link>
          <Link
            href="/admin/domains"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Domains
          </Link>
        </div>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Mentor <span className="text-gold-gradient">Domain Selections</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Every mentor and the domain(s) they have chosen to guide this cycle.
        </p>

        <div className="mb-12 flex flex-col sm:flex-row gap-4">
          <AdminSettingToggle
            role="mentor"
            field="view"
            title="Mentor Domain Visibility"
            initialEnabled={mentorDomainSelectionOpen}
            activeDescription="Mentors can currently see the domain selection screen."
            inactiveDescription="Mentors currently see the program timeline instead."
          />
          <AdminSettingToggle
            role="mentor"
            field="select"
            title="Mentor Domain Selection"
            initialEnabled={mentorCanSelect}
            activeDescription="Mentors can currently choose their domains."
            inactiveDescription="Mentors can view the domains but cannot select one yet."
          />
        </div>

        <div className="mb-12">
          <h2 className="font-serif text-xl text-foreground mb-1">Theme Capacities</h2>
          <p className="text-muted-foreground text-sm mb-4">
            How many mentors can select each theme. Changes apply immediately.
          </p>
          <DomainCapacityEditor rows={capacityRows} role="mentor" />
        </div>

        <PendingSelections people={pending} personLabel="Mentor" />

        <RoleSelectionsView
          people={mentors}
          capacities={capacities}
          domains={domains}
          personLabel="Mentor"
          personLabelPlural="mentors"
          emptyLabel="No mentors have selected a domain yet."
        />
      </div>
    </main>
  )
}
