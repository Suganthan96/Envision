import { AdminSubmissionsView } from "@/components/admin-submissions-view"
import { getSession } from "@/lib/get-session"
import { getSubmissionsForAdmin } from "@/lib/admin-directories"
import { getDomains } from "@/lib/domains"

export async function SubmissionsSection() {
  const session = await getSession()
  const [rows, domains] = await Promise.all([
    session ? getSubmissionsForAdmin(session.userId) : Promise.resolve([]),
    getDomains(),
  ])

  return <AdminSubmissionsView rows={rows} domains={domains} />
}
