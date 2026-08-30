import { AdminTeamProfilesView } from "@/components/admin-team-profiles-view"
import { getSession } from "@/lib/get-session"
import { getTeamProfilesForAdmin, type AdminTeamProfile } from "@/lib/admin-directories"
import { getDomains } from "@/lib/domains"

/** Directory fetch isolated so the page shell streams first and the grid
 *  fills in under <Suspense>. */
export async function TeamProfilesSection() {
  const session = await getSession()
  const [teams, domains]: [AdminTeamProfile[], Awaited<ReturnType<typeof getDomains>>] = await Promise.all([
    session ? getTeamProfilesForAdmin(session.userId) : Promise.resolve([]),
    getDomains(),
  ])

  return <AdminTeamProfilesView teams={teams} domains={domains} />
}
