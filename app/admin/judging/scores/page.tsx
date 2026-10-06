import { JudgingPage } from "@/components/judging/judging-page"
import { ScoresSection } from "../scores-section"

export const dynamic = "force-dynamic"

export default async function JudgingScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string | string[] }>
}) {
  const { round } = await searchParams
  const roundId = typeof round === "string" && round ? round : null

  return (
    <JudgingPage
      active="scores"
      title={
        <>
          Judging <span className="text-gold-gradient">Scores</span>
        </>
      }
      description={
        <>
          Each judging round keeps its own marks. Open a round to enter or edit every team&apos;s
          score, criterion by criterion, and to set how ties are broken.
        </>
      }
      suspenseKey={roundId ?? "all"}
    >
      <ScoresSection roundId={roundId} />
    </JudgingPage>
  )
}
