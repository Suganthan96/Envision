import { JudgingPage } from "@/components/judging/judging-page"
import { EvaluationSection } from "../evaluation-section"

export const dynamic = "force-dynamic"

export default function JudgingSheetsPage() {
  return (
    <JudgingPage
      active="sheets"
      title={<>Evaluator <span className="text-gold-gradient">Sheets</span></>}
      description={<>Every mark the faculty and jury have filed, averaged per team. Open a team to correct any sheet.</>}
    >
      <EvaluationSection section="sheets" />
    </JudgingPage>
  )
}
