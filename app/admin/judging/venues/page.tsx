import { JudgingPage } from "@/components/judging/judging-page"
import { SubmissionsSection } from "../submissions-section"

export const dynamic = "force-dynamic"

export default function JudgingVenuesPage() {
  return (
    <JudgingPage
      active="venues"
      title={<>Judging <span className="text-gold-gradient">Venues</span></>}
      description={<>The rooms teams present and wait in, and which theme or mentor&apos;s teams go where. Rooms are shared by every round, so evaluators mark the live round in the rooms set here.</>}
    >
      <SubmissionsSection section="venues" />
    </JudgingPage>
  )
}
