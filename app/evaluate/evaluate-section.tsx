import { EvaluatorConsole } from "@/components/evaluator-console"
import { getSession } from "@/lib/get-session"
import { getActiveRubric, getEvaluatorTeams } from "@/lib/evaluation"
import { isEvaluator } from "@/lib/session"

export async function EvaluateSection() {
  const session = await getSession()
  if (!session || !isEvaluator(session.role)) {
    return <p className="text-muted-foreground">Not authorized.</p>
  }

  const [teams, active] = await Promise.all([getEvaluatorTeams(session.userId), getActiveRubric()])

  return (
    <EvaluatorConsole
      teams={teams}
      rubric={active?.rubric ?? []}
      roundName={active?.presetName ?? null}
      evaluatorName={session.name ?? session.loginId}
      role={session.role === "jury" ? "jury" : "faculty"}
    />
  )
}
