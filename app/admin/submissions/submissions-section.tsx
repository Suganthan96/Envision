import { AdminSubmissionsView } from "@/components/admin-submissions-view"
import { getSession } from "@/lib/get-session"
import { getSubmissionsForAdmin } from "@/lib/admin-directories"
import { getDomains } from "@/lib/domains"
import {
  getJudgingVenues,
  getJudgingAssignments,
  getJudgingSettings,
  DEFAULT_RUBRIC,
} from "@/lib/judging"

export async function SubmissionsSection() {
  const session = await getSession()
  const admin = session?.userId

  const [rows, domains, venues, assignments, settings] = await Promise.all([
    admin ? getSubmissionsForAdmin(admin) : Promise.resolve([]),
    getDomains(),
    admin ? getJudgingVenues(admin) : Promise.resolve([]),
    admin ? getJudgingAssignments(admin) : Promise.resolve([]),
    admin
      ? getJudgingSettings(admin)
      : Promise.resolve({
          reportHeading: "EnVision 2026 - Judging Sheet",
          rubric: DEFAULT_RUBRIC,
          facultyHeading: "EnVision 2026 - Faculty Schedule",
          facultyTiming: "2:00 PM - 4:00 PM",
        }),
  ])

  return (
    <AdminSubmissionsView
      rows={rows}
      domains={domains}
      venues={venues}
      assignments={assignments}
      settings={settings}
    />
  )
}
