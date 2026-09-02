import { notFound } from "next/navigation"
import { BackLink } from "@/components/back-link"
import { AdminMentorProfileCard } from "@/components/admin-mentor-profile-card"
import { MentorTeamSummaryCard } from "@/components/mentor-team-summary-card"
import { getSession } from "@/lib/get-session"
import { getMentorProfileForAdmin } from "@/lib/admin-directories"
import { getMyTeams } from "@/lib/mentor-teams"
import { getDomains } from "@/lib/domains"
import { AdminHeader } from "@/components/admin-header"

export const dynamic = "force-dynamic"

export default async function AdminMentorProfileDetailPage({
  params,
}: {
  params: Promise<{ mentorUserId: string }>
}) {
  const { mentorUserId } = await params
  const session = await getSession()

  // This mentor's teams don't depend on the profile fetch, so all three
  // run as one batch instead of two sequential rounds.
  const [mentor, domains, teams] = await Promise.all([
    session ? getMentorProfileForAdmin(session.userId, mentorUserId) : Promise.resolve(null),
    getDomains(),
    getMyTeams(mentorUserId),
  ])

  if (!mentor) notFound()

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-4xl mx-auto">
        <AdminHeader />

        <BackLink label="Back to Mentor Profiles" fallbackHref="/admin/mentor-profiles" />

        <div className="max-w-2xl mx-auto mb-12">
          <AdminMentorProfileCard
            mentor={mentor}
            domainTitles={mentor.domainIds.map((id) => domains.find((d) => d.id === id)?.title ?? id)}
          />
        </div>

        <h2 className="font-serif text-2xl text-foreground mb-4">Teams</h2>
        {teams.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">No teams have been assigned to this mentor yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <MentorTeamSummaryCard
                key={team.studentUserId}
                team={team}
                domainTitle={team.domainId ? domains.find((d) => d.id === team.domainId)?.title ?? team.domainId : null}
                href={`/admin/team-profiles/${team.studentUserId}`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
