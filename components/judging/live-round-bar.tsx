import Link from "next/link"
import { getSession } from "@/lib/get-session"
import { getRubricPresets } from "@/lib/evaluation"
import { getRoundScoreSummaries } from "@/lib/round-scores"
import { getSubmissionsForAdmin } from "@/lib/admin-directories"

/**
 * Which round is live, shown at the top of the hub and every Judging page.
 * The live round is what evaluators mark, what the judging PDFs print and what
 * students see as the rubric, so every page states it before anything else.
 */
export async function LiveRoundBar() {
  const session = await getSession()
  const admin = session?.userId
  if (!admin) return null

  const [presets, summaries, rows] = await Promise.all([
    getRubricPresets(admin),
    getRoundScoreSummaries(admin),
    getSubmissionsForAdmin(admin),
  ])
  const live = presets.find((p) => p.isActive) ?? null

  if (!live) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-destructive/50 rounded-lg bg-card/40 px-5 py-3 mb-8">
        <p className="text-sm text-foreground">
          <span className="text-destructive uppercase tracking-[0.1em] text-[10px] mr-2">No live round</span>
          Evaluators have nothing to mark until a round is made live.
        </p>
        <Link href="/admin/judging/rounds" className="text-primary text-xs uppercase tracking-[0.1em] hover:underline">
          Choose a round →
        </Link>
      </div>
    )
  }

  const outOf = live.rubric.reduce((s, r) => s + (Number(r.max) || 0), 0)
  const scored = summaries.find((s) => s.presetId === live.id)?.scoredCount ?? 0

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border border-primary/60 rounded-lg bg-card/40 px-5 py-3 mb-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
        <span className="inline-flex items-center gap-1.5 text-primary text-[10px] uppercase tracking-[0.1em]">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Live round
        </span>
        <span className="font-serif text-xl text-foreground">{live.name}</span>
        <span className="text-muted-foreground text-sm">
          {live.rubric.length} criteria, out of {outOf} &middot; {scored} of {rows.length} teams scored
          &middot; {live.evaluationCount} sheets filed
          {live.scoresPublished ? " · on the leaderboard" : " · not on the leaderboard"}
        </span>
      </div>
      <div className="flex gap-4 text-xs uppercase tracking-[0.1em]">
        <Link href={`/admin/judging/scores?round=${live.id}`} className="text-primary hover:underline">
          Scores →
        </Link>
        <Link href="/admin/judging/rounds" className="text-muted-foreground hover:text-primary">
          Change round
        </Link>
      </div>
    </div>
  )
}
