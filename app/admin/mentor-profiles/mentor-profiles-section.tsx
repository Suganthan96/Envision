import { AdminMentorProfilesView } from "@/components/admin-mentor-profiles-view"
import { getSession } from "@/lib/get-session"
import { getMentorProfilesForAdmin } from "@/lib/admin-directories"
import { getDomains } from "@/lib/domains"

/** Directory fetch isolated so the page shell streams first and the grid
 *  fills in under <Suspense>. */
export async function MentorProfilesSection() {
  const session = await getSession()
  const [mentors, domains] = await Promise.all([
    session ? getMentorProfilesForAdmin(session.userId) : Promise.resolve([]),
    getDomains(),
  ])

  return <AdminMentorProfilesView mentors={mentors} domains={domains} />
}
