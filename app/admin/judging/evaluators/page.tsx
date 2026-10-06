import { JudgingPage } from "@/components/judging/judging-page"
import { EvaluationSection } from "../evaluation-section"

export const dynamic = "force-dynamic"

export default function JudgingEvaluatorsPage() {
  return (
    <JudgingPage
      active="evaluators"
      title={<>Faculty &amp; <span className="text-gold-gradient">Jury</span></>}
      description={<>Which rooms and extra teams each faculty member and juror marks.</>}
    >
      <EvaluationSection section="evaluators" />
    </JudgingPage>
  )
}
