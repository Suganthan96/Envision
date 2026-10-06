"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { rankTeams } from "@/lib/leaderboard-rank"

export interface PickerRound {
  id: string
  name: string
  max: number
  tiebreak: string[]
  published: boolean
  live: boolean
}

export interface PickerTeam {
  studentUserId: string
  loginId: string
  teamName: string
  mentorName: string | null
  scores: Record<string, number>
  marks: Record<string, Record<string, number>>
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""))
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

/**
 * The admin home's leaderboard. Pick one round to rank by it, or several to
 * rank by their average, using exactly the rule the real leaderboard uses.
 * It starts on the published rounds, so by default it is what teams see.
 */
export function LeaderboardPicker({ rounds, teams }: { rounds: PickerRound[]; teams: PickerTeam[] }) {
  const published = useMemo(() => rounds.filter((r) => r.published).map((r) => r.id), [rounds])
  const [selected, setSelected] = useState<string[]>(() =>
    published.length ? published : rounds.filter((r) => r.live).map((r) => r.id),
  )
  const [showAll, setShowAll] = useState(false)

  // Keep the rounds in their own order, whatever order they were clicked in.
  const chosen = useMemo(() => rounds.filter((r) => selected.includes(r.id)), [rounds, selected])
  const ranked = useMemo(() => rankTeams(chosen, teams), [chosen, teams])
  const max = chosen.length ? chosen.reduce((s, r) => s + r.max, 0) / chosen.length : 0
  const averaged = chosen.length > 1
  const missing = averaged
    ? chosen
        .map((r) => ({ round: r, count: teams.filter((t) => t.scores[r.id] == null).length }))
        .filter((m) => m.count > 0)
    : []
  const isPublished = sameSet(selected, published)
  const shown = showAll ? ranked : ranked.slice(0, 5)

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  if (rounds.length === 0) {
    return <p className="text-muted-foreground">No judging rounds yet. Create one under Judging, then Rounds.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-border border-y border-border" aria-label="Rounds to rank by">
        {rounds.map((r) => {
          const on = selected.includes(r.id)
          const id = `lb-round-${r.id}`
          return (
            <li key={r.id}>
              <label htmlFor={id} className="flex items-center gap-3 py-2.5 cursor-pointer">
                <Switch id={id} checked={on} onCheckedChange={() => toggle(r.id)} />
                <span className={cn("flex-1 min-w-0 truncate text-sm", on ? "text-foreground" : "text-muted-foreground")}>
                  {r.name}
                </span>
                {r.published && <span className="text-xs text-primary whitespace-nowrap">Teams see this</span>}
                {r.live && !r.published && <span className="text-xs text-muted-foreground whitespace-nowrap">Live</span>}
              </label>
            </li>
          )
        })}
      </ul>

      <p className="text-sm text-muted-foreground">
        {chosen.length === 0
          ? "Pick a round to rank the teams."
          : averaged
            ? `Ranked by the average of ${chosen.map((r) => r.name).join(" and ")}.`
            : `Ranked by ${chosen[0].name}.`}{" "}
        {chosen.length > 0 &&
          (isPublished ? (
            "This is what teams and mentors see."
          ) : (
            <>
              Preview only: teams see {published.length ? "the rounds marked \u201cTeams see this\u201d" : "no leaderboard yet"}.{" "}
              <Link href="/admin/judging/scores" className="text-primary hover:underline">
                Change that in Scores
              </Link>
              .
            </>
          ))}
      </p>

      {missing.length > 0 && (
        <p className="text-sm text-foreground border-l-2 border-primary pl-3">
          {missing
            .map((m) => `${m.count} ${m.count === 1 ? "team has" : "teams have"} no ${m.round.name} score`)
            .join(", and ")}
          . A missing round counts as 0 in the average.
        </p>
      )}

      {ranked.length > 0 && (
        <>
          <ol className="flex flex-col divide-y divide-border">
            {shown.map((e) => (
              <li key={e.studentUserId} className="flex items-center gap-4 py-2.5">
                <span
                  className={cn(
                    "font-serif text-2xl w-8 text-right tabular-nums leading-none shrink-0",
                    e.rank === 1 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {e.rank}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-foreground truncate">{e.teamName}</span>
                  <span
                    className="block text-xs text-muted-foreground truncate"
                    title={
                      averaged
                        ? chosen
                            .map((r) => `${r.name}: ${e.scores[r.id] == null ? "not scored (0)" : fmt(e.scores[r.id])}`)
                            .join(", ")
                        : undefined
                    }
                  >
                    Team {e.loginId}
                    {averaged
                      ? `, ${chosen.map((r) => (e.scores[r.id] == null ? "0" : fmt(e.scores[r.id]))).join(" + ")} in ${chosen.length} rounds`
                      : e.mentorName
                        ? `, mentored by ${e.mentorName}`
                        : ""}
                  </span>
                </span>
                <span className="tabular-nums text-foreground whitespace-nowrap">
                  {fmt(e.overall)}
                  <span className="text-muted-foreground text-sm">/{fmt(max)}</span>
                </span>
              </li>
            ))}
          </ol>
          {ranked.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="self-start text-sm text-muted-foreground hover:text-primary"
            >
              {showAll ? "Show the top 5" : `Show all ${ranked.length} teams`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
