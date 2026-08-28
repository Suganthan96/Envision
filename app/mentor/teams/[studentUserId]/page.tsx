import { notFound } from "next/navigation"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { TeamDetailView } from "@/components/team-detail-view"
import { getSession } from "@/lib/get-session"
import { getMyTeams } from "@/lib/mentor-teams"
import { getTeamMembers } from "@/lib/team-members"
import { getDomains } from "@/lib/domains"

export const dynamic = "force-dynamic"

export default async function MentorTeamDetailPage({
  params,
}: {
  params: Promise<{ studentUserId: string }>
}) {
  const { studentUserId } = await params
  const session = await getSession()

  // The roster doesn't depend on the assignment check below, so it's fetched
  // alongside rather than after it.
  const [teams, domains, members] = await Promise.all([
    session ? getMyTeams(session.userId) : Promise.resolve([]),
    getDomains(),
    getTeamMembers(studentUserId),
  ])

  const team = teams.find((t) => t.studentUserId === studentUserId)
  if (!team) notFound()
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
          eyebrow="Mentor Portal"
          backHref="/mentor/teams"
          backLabel="Back to My Teams"
        />
      </div>
    </main>
  )
}
