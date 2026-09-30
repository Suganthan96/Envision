import Link from "next/link"
import { AdminScoresView } from "@/components/admin-scores-view"
import { ScoreRoundCards } from "@/components/score-round-cards"
import { getSession } from "@/lib/get-session"
import { getSubmissionsForAdmin } from "@/lib/admin-directories"
import { getJudgingVenues, getJudgingAssignments } from "@/lib/judging"
import { getRubricPresets } from "@/lib/evaluation"
import { getRoundScoreSummaries, getRoundScores } from "@/lib/round-scores"

/**
 * Without a round: one card per judging round. With `?round=<id>`: that
 * round's marking console, where each team's score can be entered or edited.
 */
export async function ScoresSection({ roundId }: { roundId: string | null }) {
  const session = await getSession()
  const admin = session?.userId
  if (!admin) return null

  const presets = await getRubricPresets(admin)
  const preset = roundId ? presets.find((p) => p.id === roundId) ?? null : null

  if (!preset) {
    const [summaries, rows] = await Promise.all([
      getRoundScoreSummaries(admin),
      getSubmissionsForAdmin(admin),
    ])
    return (
      <>
        {roundId && <p className="text-destructive text-sm mb-4">That round no longer exists.</p>}
        <ScoreRoundCards presets={presets} summaries={summaries} teamCount={rows.length} />
      </>
    )
  }

  const [rows, venues, assignments, scores] = await Promise.all([
    getSubmissionsForAdmin(admin),
    getJudgingVenues(admin, "judging"),
    getJudgingAssignments(admin),
    getRoundScores(admin, preset.id),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Link
            href="/admin/scores"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            ← All rounds
          </Link>
          <h2 className="font-serif text-3xl text-foreground mt-3">
            {preset.name}
            {preset.isActive && (
              <span className="text-primary text-[10px] uppercase tracking-[0.1em] border border-primary rounded px-1.5 py-0.5 ml-3 align-middle">
                Live
              </span>
            )}
          </h2>
        </div>
      </div>
      <AdminScoresView
        key={preset.id}
        presetId={preset.id}
        rubric={preset.rubric}
        scores={scores}
        rows={rows}
        venues={venues}
        assignments={assignments}
      />
    </div>
  )
}
