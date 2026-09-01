import { notFound } from "next/navigation"
import { TeamDetailView } from "@/components/team-detail-view"
import { getSession } from "@/lib/get-session"
import { getMyTeams } from "@/lib/mentor-teams"
import { getTeamMembers } from "@/lib/team-members"
import { getDomains } from "@/lib/domains"
import { PortalHeader } from "@/components/portal-header"

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
      <PortalHeader maxWidth="max-w-4xl" />

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
