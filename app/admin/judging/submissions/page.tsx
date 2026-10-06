import { JudgingPage } from "@/components/judging/judging-page"
import { SubmissionsSection } from "../submissions-section"

export const dynamic = "force-dynamic"

export default function JudgingSubmissionsPage() {
  return (
    <JudgingPage
      active="submissions"
      title={<>Team <span className="text-gold-gradient">Submissions</span></>}
      description={<>Every team&apos;s final deck: the Canva link and/or the file uploaded to Google Drive. Override a team&apos;s judging or waiting room here.</>}
    >
      <SubmissionsSection section="submissions" />
    </JudgingPage>
  )
}
