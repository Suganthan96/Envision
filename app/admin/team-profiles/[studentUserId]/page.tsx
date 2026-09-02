import { notFound } from "next/navigation"
import { TeamDetailView } from "@/components/team-detail-view"
import { getSession } from "@/lib/get-session"
import { getTeamProfileForAdmin } from "@/lib/admin-directories"
import { getTeamMembers } from "@/lib/team-members"
import { getMyMentor } from "@/lib/mentor-profile"
import { getDomains } from "@/lib/domains"
import { AdminHeader } from "@/components/admin-header"

export const dynamic = "force-dynamic"

export default async function AdminTeamProfileDetailPage({
  params,
}: {
  params: Promise<{ studentUserId: string }>
}) {
  const { studentUserId } = await params
  const session = await getSession()

  // Roster and mentor lookup don't depend on the profile fetch below, so
  // all four run as one batch instead of two sequential rounds.
  const [team, domains, members, mentor] = await Promise.all([
    session ? getTeamProfileForAdmin(session.userId, studentUserId) : Promise.resolve(null),
    getDomains(),
    getTeamMembers(studentUserId),
    getMyMentor(studentUserId),
  ])

  if (!team) notFound()
  const domainTitle = team.domainId ? domains.find((d) => d.id === team.domainId)?.title ?? team.domainId : null

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <AdminHeader />

      <div className="relative z-10 max-w-4xl mx-auto">
        <TeamDetailView
          team={team}
          domainTitle={domainTitle}
          members={members}
          eyebrow="Admin Portal"
          backHref="/admin/team-profiles"
          backLabel="Back to Team Profiles"
          mentor={mentor}
          mentorHref={(mentorUserId) => `/admin/mentor-profiles/${mentorUserId}`}
        />
      </div>
    </main>
  )
}
