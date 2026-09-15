import { AdminEvaluationView } from "@/components/admin-evaluation-view"
import { getSession } from "@/lib/get-session"
import { getSubmissionsForAdmin } from "@/lib/admin-directories"
import { getJudgingVenues } from "@/lib/judging"
import { getEvaluations, getEvaluators, getRubricPresets, type EvaluationRow } from "@/lib/evaluation"

export async function EvaluationSection() {
  const session = await getSession()
  const admin = session?.userId
  if (!admin) return <p className="text-muted-foreground">Not authorized.</p>

  const [rows, venues, presets, evaluators] = await Promise.all([
    getSubmissionsForAdmin(admin),
    getJudgingVenues(admin, "judging"),
    getRubricPresets(admin),
    getEvaluators(admin),
  ])

  // A handful of rounds, so fetching every round's sheets up front is cheaper
  // than a round-trip each time the admin switches between them.
  const byPreset = await Promise.all(
    presets.map(async (p) => [p.id, await getEvaluations(admin, p.id)] as const),
  )

  return (
    <AdminEvaluationView
      teams={rows.map((r) => ({
        studentUserId: r.studentUserId,
        loginId: r.loginId,
        teamName: r.teamName,
      }))}
      venues={venues}
      presets={presets}
      evaluators={evaluators}
      evaluationsByPreset={Object.fromEntries(byPreset) as Record<string, EvaluationRow[]>}
    />
  )
}
