import { JudgingPage } from "@/components/judging/judging-page"
import { EvaluationSection } from "../evaluation-section"

export const dynamic = "force-dynamic"

export default function JudgingRoundsPage() {
  return (
    <JudgingPage
      active="rounds"
      title={<>Judging <span className="text-gold-gradient">Rounds</span></>}
      description={<>The rubric for each round, and which round is live.</>}
    >
      <EvaluationSection section="rounds" />
    </JudgingPage>
  )
}
