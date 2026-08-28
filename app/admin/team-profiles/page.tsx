import { Suspense } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminTeamProfilesView } from "@/components/admin-team-profiles-view"
import { getSession } from "@/lib/get-session"
import { getTeamProfilesForAdmin, type AdminTeamProfile } from "@/lib/admin-directories"
import { getDomains } from "@/lib/domains"
import { AdminHeader } from "@/components/admin-header"

export const dynamic = "force-dynamic"

export default async function AdminTeamProfilesPage() {
  const session = await getSession()
  const [teams, domains]: [AdminTeamProfile[], Awaited<ReturnType<typeof getDomains>>] = await Promise.all([
    session ? getTeamProfilesForAdmin(session.userId) : Promise.resolve([]),
    getDomains(),
  ])

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/team-profiles" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Team <span className="text-gold-gradient">Profiles</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Every team&apos;s logo, roster size, domain, and project, in one searchable directory.
        </p>

        <Suspense fallback={null}>
          <AdminTeamProfilesView teams={teams} domains={domains} />
        </Suspense>
      </div>
    </main>
  )
}
