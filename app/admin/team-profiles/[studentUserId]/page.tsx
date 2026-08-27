import { notFound } from "next/navigation"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { TeamDetailView } from "@/components/team-detail-view"
import { getSession } from "@/lib/get-session"
import { getTeamProfilesForAdmin } from "@/lib/admin-directories"
import { getTeamMembers } from "@/lib/team-members"
import { getDomains } from "@/lib/domains"

export const dynamic = "force-dynamic"

export default async function AdminTeamProfileDetailPage({
  params,
}: {
  params: Promise<{ studentUserId: string }>
}) {
  const { studentUserId } = await params
  const session = await getSession()

  const [teams, domains] = await Promise.all([
    session ? getTeamProfilesForAdmin(session.userId) : Promise.resolve([]),
    getDomains(),
  ])

  const team = teams.find((t) => t.studentUserId === studentUserId)
  if (!team) notFound()

  const members = await getTeamMembers(studentUserId)
  const domainTitle = team.domainId ? domains.find((d) => d.id === team.domainId)?.title ?? team.domainId : null

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-8 h-px bg-primary" />
          <span className="font-serif text-xl text-foreground">Envision</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle variant="inline" />
          <LogoutButton />
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <TeamDetailView
          team={team}
          domainTitle={domainTitle}
          members={members}
          eyebrow="Admin Portal"
          backHref="/admin/team-profiles"
          backLabel="Back to Team Profiles"
        />
      </div>
    </main>
  )
}
