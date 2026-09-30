"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronRight } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { RubricPreset } from "@/lib/evaluation"
import type { RoundScoreSummary } from "@/lib/round-scores"

/**
 * One card per judging round. Each round keeps its own marks, so earlier
 * rounds stay intact; a card opens that round's marking console, where every
 * team's score can be entered or edited. The switch on each card publishes
 * that round's scores to the member leaderboard.
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
  const [published, setPublished] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(presets.map((p) => [p.id, p.scoresPublished])),
  )
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function togglePublished(id: string, next: boolean) {
    setError("")
    setPending(id)
    setPublished((cur) => ({ ...cur, [id]: next }))
    try {
      const res = await fetch("/api/admin/judging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish-round", id, published: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.")
    } catch (e) {
      setPublished((cur) => ({ ...cur, [id]: !next }))
      setError(e instanceof Error ? e.message : "Could not update the leaderboard.")
    } finally {
      setPending(null)
    }
  }

  if (presets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No judging rounds yet — create one on the Judging Rounds page.
      </p>
    )
  }

  const publishedCount = presets.filter((p) => published[p.id]).length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {publishedCount === 0
          ? "No rounds are on the member leaderboard yet."
          : publishedCount === 1
            ? "1 round is on the member leaderboard."
            : `${publishedCount} rounds are on the member leaderboard — teams are ranked by their average.`}
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((p) => {
          const s = byPreset.get(p.id)
          const scored = s?.scoredCount ?? 0
          const maxTotal = p.rubric.reduce((sum, r) => sum + (Number(r.max) || 0), 0)
          const pct = teamCount > 0 ? Math.min(100, Math.round((scored / teamCount) * 100)) : 0
          return (
            <div
              key={p.id}
              className={cn(
                "flex flex-col bg-card/35 backdrop-blur-sm border border-border rounded-lg",
                "hover:border-primary transition-colors",
                p.isActive && "border-primary/60",
              )}
            >
              <Link href={`/admin/scores?round=${p.id}`} className="group flex flex-col gap-4 p-6 flex-1">
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
              <label className="flex items-center gap-3 px-6 py-3 border-t border-border cursor-pointer">
                <Switch
                  checked={published[p.id] ?? false}
                  onCheckedChange={(next) => togglePublished(p.id, next)}
                  disabled={pending === p.id}
                />
                <span className="text-sm text-foreground">Show on leaderboard</span>
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
