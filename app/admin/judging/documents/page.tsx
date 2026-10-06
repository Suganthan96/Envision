import { JudgingPage } from "@/components/judging/judging-page"
import { SubmissionsSection } from "../submissions-section"

export const dynamic = "force-dynamic"

export default function JudgingDocumentsPage() {
  return (
    <JudgingPage
      active="documents"
      title={<>Documents &amp; <span className="text-gold-gradient">Exports</span></>}
      description={<>What the judging sheets print, and every download: the Excel sheet and the faculty, team details and judging PDFs.</>}
    >
      <SubmissionsSection section="documents" />
    </JudgingPage>
  )
}
