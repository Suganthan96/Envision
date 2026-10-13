import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { ReportsCenter } from "@/components/reports/reports-center"
import { getSession } from "@/lib/get-session"
import { getSubmissionsForAdmin } from "@/lib/admin-directories"
import { getRubricPresets } from "@/lib/evaluation"
import { getRequestEdition } from "@/lib/edition"

export const dynamic = "force-dynamic"

/** Downloads: statistics, team reports, records, results — for the year being worked in. */
export default async function AdminReportsPage() {
  const session = await getSession()
  const admin = session?.userId
  const [edition, teams, rounds] = await Promise.all([
    getRequestEdition(),
    admin ? getSubmissionsForAdmin(admin) : Promise.resolve([]),
    admin ? getRubricPresets(admin) : Promise.resolve([]),
  ])

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/reports" />

        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">Reports and downloads</h1>
        <p className="text-muted-foreground text-lg mb-10 max-w-3xl">
          Statistics, individual team reports, results and every record, as PDF or Excel.
        </p>

        <ReportsCenter
          yearLabel={edition.label}
          teams={[...teams]
            .sort((a, b) => Number(a.loginId) - Number(b.loginId) || a.loginId.localeCompare(b.loginId))
            .map((t) => ({ loginId: t.loginId, teamName: t.teamName?.trim() || `Team ${t.loginId}` }))}
          rounds={rounds.map((r) => ({ id: r.id, name: r.name, live: r.isActive, published: r.scoresPublished }))}
        />
      </div>
    </main>
  )
}
