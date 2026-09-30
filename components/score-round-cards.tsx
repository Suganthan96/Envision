import Link from "next/link"
import { Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RubricPreset } from "@/lib/evaluation"
import type { RoundScoreSummary } from "@/lib/round-scores"

/**
 * One card per judging round. Each round keeps its own marks, so earlier
 * rounds stay intact; a card opens that round's marking console, where every
 * team's score can be entered or edited.
 */
export function ScoreRoundCards({
  presets,
  summaries,
  teamCount,
}: {
  presets: RubricPreset[]
  summaries: RoundScoreSummary[]
  teamCount: number
}) {
  const byPreset = new Map(summaries.map((s) => [s.presetId, s]))

  if (presets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No judging rounds yet — create one on the Judging Rounds page.
      </p>
    )
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {presets.map((p) => {
        const s = byPreset.get(p.id)
        const scored = s?.scoredCount ?? 0
        const maxTotal = p.rubric.reduce((sum, r) => sum + (Number(r.max) || 0), 0)
        const pct = teamCount > 0 ? Math.min(100, Math.round((scored / teamCount) * 100)) : 0
        return (
          <Link
            key={p.id}
            href={`/admin/scores?round=${p.id}`}
            className={cn(
              "group relative flex flex-col gap-4 p-6 bg-card/35 backdrop-blur-sm border border-border rounded-lg",
              "hover:border-primary transition-colors",
              p.isActive && "border-primary/60",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-2xl text-foreground truncate" title={p.name}>
                  {p.name}
                </h2>
                <p className="text-muted-foreground text-xs mt-1">
                  {p.rubric.length} criteria &middot; out of {maxTotal}
                </p>
              </div>
              {p.isActive && (
                <span className="inline-flex items-center gap-1 text-primary text-[10px] uppercase tracking-[0.1em] border border-primary rounded px-1.5 py-0.5 shrink-0">
                  <Check className="w-3 h-3" /> Live
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-sm">
                <span className="text-foreground font-medium tabular-nums">{scored}</span>
                <span className="text-muted-foreground"> of {teamCount} teams scored</span>
              </p>
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-primary tracking-[0.1em] uppercase text-[10px]">Average</dt>
                <dd className="text-foreground tabular-nums">
                  {s?.averageTotal == null ? "—" : s.averageTotal}
                </dd>
              </div>
              <div>
                <dt className="text-primary tracking-[0.1em] uppercase text-[10px]">Top</dt>
                <dd className="text-foreground tabular-nums">{s?.topTotal == null ? "—" : s.topTotal}</dd>
              </div>
            </dl>

            <span className="inline-flex items-center gap-1 text-primary text-xs uppercase tracking-[0.1em] mt-auto">
              {scored > 0 ? "View & edit scores" : "Enter scores"}
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        )
      })}
    </div>
  )
}
