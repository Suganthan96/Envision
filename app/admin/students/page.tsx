import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdminNav } from "@/components/admin-nav"
import { RoleSelectionsView, type RoleRow } from "@/components/role-selections-view"
import { AdminSettingToggle } from "@/components/admin-setting-toggle"
import { PendingSelections, type PendingPerson } from "@/components/pending-selections"
import { DomainCapacityEditor, type DomainCapacityRow } from "@/components/domain-capacity-editor"
import { getSession } from "@/lib/get-session"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getAppSettings } from "@/lib/app-settings"
import { getDomains, type Domain } from "@/lib/domains"
import { getDomainCapacities } from "@/lib/domain-capacities"

export default async function AdminStudentsPage() {
  const session = await getSession()

  let students: RoleRow[] = []
  let pending: PendingPerson[] = []
  let capacityRows: DomainCapacityRow[] = []
  let capacities: Record<string, number> = {}
  let domains: Domain[] = []
  if (session) {
    const supabase = getSupabaseServerClient()
    const [{ data }, { data: pendingData }, capacityData, domainsResult] = await Promise.all([
      supabase.rpc("admin_list_domain_selections", { p_admin_user_id: session.userId }),
      supabase.rpc("admin_list_pending_domain_selections", { p_admin_user_id: session.userId, p_role: "member" }),
      getDomainCapacities(),
      getDomains(),
    ])
    domains = domainsResult

    const capacityData2 = capacityData
    capacityRows = domains.map((d) => ({
      domainId: d.id,
      title: d.title,
      capacity: capacityData2.find((c) => c.domain_id === d.id)?.student_capacity ?? 6,
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
      if (row.role !== "member") continue
      const existing =
        grouped.get(row.login_id) ??
        { name: row.name, phone: row.phone, email: row.email, teamLeadName: row.team_lead_name, domainIds: [] }
      existing.domainIds.push(row.domain_id)
      grouped.set(row.login_id, existing)
    }
    students = Array.from(grouped.entries()).map(([loginId, { name, phone, email, teamLeadName, domainIds }]) => ({
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
  const { studentDomainSelectionOpen, studentCanSelect, teamNameEditOpen } = await getAppSettings()

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

        <AdminNav active="/admin/students" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Student <span className="text-gold-gradient">Domain Selections</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Every student and the domain they have chosen to build their project in this cycle.
        </p>

        <div className="mb-12 flex flex-col sm:flex-row sm:flex-wrap gap-4">
          <AdminSettingToggle
            role="member"
            field="view"
            title="Student Domain Visibility"
            initialEnabled={studentDomainSelectionOpen}
            activeDescription="Students can currently see the domain selection screen."
            inactiveDescription="Students currently see the program timeline instead."
          />
          <AdminSettingToggle
            role="member"
            field="select"
            title="Student Domain Selection"
            initialEnabled={studentCanSelect}
            activeDescription="Students can currently choose their domain."
            inactiveDescription="Students can view the domains but cannot select one yet."
          />
          <AdminSettingToggle
            field="teamNameEdit"
            title="Team Name Editing"
            initialEnabled={teamNameEditOpen}
            activeDescription="Students can rename their team from their dashboard."
            inactiveDescription="Team names are locked and cannot be changed."
          />
        </div>

        <div className="mb-12">
          <h2 className="font-serif text-xl text-foreground mb-1">Theme Capacities</h2>
          <p className="text-muted-foreground text-sm mb-4">
            How many students can select each theme. Changes apply immediately.
          </p>
          <DomainCapacityEditor rows={capacityRows} role="member" />
        </div>

        <PendingSelections people={pending} personLabel="Student" />

        <RoleSelectionsView
          people={students}
          capacities={capacities}
          domains={domains}
          personLabel="Student"
          personLabelPlural="students"
          emptyLabel="No students have selected a domain yet."
        />
      </div>
    </main>
  )
}
