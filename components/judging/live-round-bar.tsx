import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getSession } from "@/lib/get-session"
import { getRubricPresets } from "@/lib/evaluation"
import { getRoundScoreSummaries } from "@/lib/round-scores"
import { getSubmissionsForAdmin } from "@/lib/admin-directories"
import { cn } from "@/lib/utils"

/**
 * Which round is live, shown at the top of the hub and every Judging page.
 * The live round is what evaluators mark, what the judging PDFs print and what
 * students see as the rubric, so every page states it before anything else.
 * Rendered inside the JudgingBand card, so it brings no frame of its own.
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-3 text-sm text-foreground">
          <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
          <span className="text-destructive uppercase tracking-[0.15em] text-[10px]">No live round</span>
          <span className="text-muted-foreground">Evaluators have nothing to mark until a round is live.</span>
        </p>
        <ActionLink href="/admin/judging/rounds" primary>
          Choose a round
        </ActionLink>
      </div>
    )
  }

  const outOf = live.rubric.reduce((s, r) => s + (Number(r.max) || 0), 0)
  const scored = summaries.find((s) => s.presetId === live.id)?.scoredCount ?? 0
  const pct = rows.length > 0 ? Math.min(100, Math.round((scored / rows.length) * 100)) : 0

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
      <div className="flex items-center gap-3 min-w-0 lg:max-w-[16rem] shrink-0">
        <span className="relative flex w-2.5 h-2.5 shrink-0">
          <span className="absolute inset-0 rounded-full bg-primary opacity-60 animate-ping" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-primary uppercase tracking-[0.15em] text-[10px] leading-none mb-1.5">Live round</p>
          <p className="font-serif text-xl text-foreground leading-tight truncate" title={live.name}>
            {live.name}
          </p>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-10 gap-y-3 flex-1 text-sm">
        <Stat label="Rubric">
          {live.rubric.length} criteria <span className="text-muted-foreground">/ {outOf}</span>
        </Stat>
        <Stat label="Scored">
          <span className="flex flex-col gap-1.5">
            <span>
              {scored} <span className="text-muted-foreground">of {rows.length}</span>
            </span>
            <span className="h-1 w-20 rounded-full bg-border overflow-hidden">
              <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
            </span>
          </span>
        </Stat>
        <Stat label="Sheets">{live.evaluationCount}</Stat>
        <Stat label="Leaderboard">
          <span className={cn(live.scoresPublished ? "text-primary" : "text-muted-foreground")}>
            {live.scoresPublished ? "Published" : "Hidden"}
          </span>
        </Stat>
      </dl>

      <div className="flex gap-2 shrink-0">
        <ActionLink href={`/admin/judging/scores?round=${live.id}`} primary>
          Scores
        </ActionLink>
        <ActionLink href="/admin/judging/rounds">Change round</ActionLink>
      </div>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="whitespace-nowrap">
      <dt className="text-muted-foreground uppercase tracking-[0.12em] text-[10px] mb-1">{label}</dt>
      <dd className="text-foreground tabular-nums">{children}</dd>
    </div>
  )
}

function ActionLink({ href, primary, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border text-xs uppercase tracking-[0.12em] transition-colors whitespace-nowrap",
        primary
          ? "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary",
      )}
    >
      {children}
      {primary && <ArrowRight className="w-3.5 h-3.5" />}
    </Link>
  )
}
