"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/searchable-select"
import { MarkSheet } from "@/components/mark-sheet"
import { cn } from "@/lib/utils"
import type { RubricRow } from "@/lib/judging"
import type { EvaluatorTeam } from "@/lib/evaluation"

// A refresh landing mid-save would hand back the server's pre-save marks, so
// the sync below waits until saving has settled.
let inFlight = 0
let lastWriteAt = 0
const writesSettled = () => inFlight === 0 && Date.now() - lastWriteAt > 3_000

async function saveMarksRequest(studentUserId: string, marks: Record<string, number>) {
  inFlight += 1
  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentUserId, marks }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.")
    return data
  } finally {
    inFlight -= 1
    lastWriteAt = Date.now()
  }
}

const EMPTY_MARKS: Record<string, number> = {}

/**
 * The faculty / external-jury portal: the teams presenting in the rooms this
 * evaluator was assigned, and the mark sheet for the round the admin has made
 * active. These are this evaluator's own marks — nobody else's are shown, and
 * nobody else can overwrite them.
 */
export function EvaluatorConsole({
  teams,
  rubric,
  roundName,
  evaluatorName,
  role,
}: {
  teams: EvaluatorTeam[]
  rubric: RubricRow[]
  roundName: string | null
  evaluatorName: string
  role: "faculty" | "jury"
}) {
  const [marksByTeam, setMarksByTeam] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(teams.map((t) => [t.studentUserId, t.marks])),
  )
  const [selected, setSelected] = useState("")
  const [error, setError] = useState("")

  const [query, setQuery] = useState("")
  const [venueFilter, setVenueFilter] = useState("")

  // Kept in a ref so the refresh-sync effect below can read the current
  // selection without re-running every time it changes.
  const selectedRef = useRef(selected)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  // The page refreshes itself on a timer, so take the server's marks for every
  // team EXCEPT the one open in the sheet — overwriting that one would wipe a
  // criterion mid-entry.
  const serverKey = JSON.stringify(teams.map((t) => [t.studentUserId, t.marks]))
  useEffect(() => {
    if (!writesSettled()) return
    setMarksByTeam((cur) => {
      const next = { ...cur }
      for (const t of teams) {
        if (t.studentUserId === selectedRef.current) continue
        next[t.studentUserId] = t.marks
      }
      return next
    })
    // selected is read through a ref so a refresh doesn't fight the selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey])

  const rubricTotal = useMemo(
    () => rubric.reduce((sum, row) => sum + (Number(row.max) || 0), 0),
    [rubric],
  )

  function totalFor(studentUserId: string): number | null {
    const marks = marksByTeam[studentUserId]
    if (!marks) return null
    const values = Object.values(marks)
    if (values.length === 0) return null
    return values.reduce((sum, v) => sum + v, 0)
  }

  async function saveMarks(studentUserId: string, next: Record<string, number>) {
    setError("")
    const prev = marksByTeam[studentUserId] ?? {}
    setMarksByTeam((cur) => ({ ...cur, [studentUserId]: next }))
    try {
      await saveMarksRequest(studentUserId, next)
    } catch (e) {
      setMarksByTeam((cur) => ({ ...cur, [studentUserId]: prev }))
      setError(e instanceof Error ? e.message : "Could not save the marks.")
    }
  }

  // Only worth showing the venue filter to someone covering more than one room.
  const venueOptions = useMemo(() => {
    const names = [...new Set(teams.map((t) => t.venueName).filter(Boolean))] as string[]
    return names.sort().map((n) => ({ value: n, label: n }))
  }, [teams])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return teams
      .filter((t) => {
        if (venueFilter && t.venueName !== venueFilter) return false
        if (!q) return true
        return [t.loginId, t.teamName, t.projectTitle]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      })
      // Team numbers are text in the database, so sorting there puts #3 after
      // #23. The running order has to read the way the room does.
      .sort(
        (a, b) => Number(a.loginId) - Number(b.loginId) || a.loginId.localeCompare(b.loginId),
      )
  }, [teams, query, venueFilter])

  useEffect(() => {
    if (list.length === 0) {
      setSelected("")
      return
    }
    setSelected((cur) => (list.some((t) => t.studentUserId === cur) ? cur : list[0].studentUserId))
  }, [list])

  const index = list.findIndex((t) => t.studentUserId === selected)
  const team = index >= 0 ? list[index] : null

  function step(delta: number) {
    const next = list[index + delta]
    if (next) setSelected(next.studentUserId)
  }

  const done = list.filter((t) => totalFor(t.studentUserId) != null).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">
          {role === "jury" ? "External Jury" : "Faculty"} Portal
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          {roundName ? (
            <>
              <span className="text-gold-gradient">{roundName}</span>
            </>
          ) : (
            "Evaluation"
          )}
        </h1>
        <p className="text-muted-foreground text-lg">
          {evaluatorName} &middot; marking against the criteria the organisers have made active.
        </p>
      </div>

      {rubric.length === 0 ? (
        <p className="text-muted-foreground">
          No evaluation round is open yet. This page will fill in once the organisers activate one.
        </p>
      ) : teams.length === 0 ? (
        <p className="text-muted-foreground">
          No teams have been assigned to you yet. The organisers assign each evaluator the rooms
          they cover — check with them if you were expecting teams here.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4">
            {venueOptions.length > 1 && (
              <div className="flex flex-col gap-1.5 w-full sm:max-w-[200px]">
                <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Venue</Label>
                <SearchableSelect
                  value={venueFilter}
                  onChange={setVenueFilter}
                  options={venueOptions}
                  allLabel="All my venues"
                  placeholder="Search venues…"
                  className="h-10"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5 w-full sm:max-w-xs">
              <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Search</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Team or login ID…"
                className="bg-card border-border text-foreground h-10"
              />
            </div>
            <p className="text-sm text-muted-foreground pb-2.5 ml-auto">
              <span className="text-foreground font-medium">{done}</span> of {list.length} marked
            </p>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex flex-col lg:flex-row gap-5 items-start">
            <div className="w-full lg:w-72 shrink-0 border border-border rounded-lg bg-card/40 max-h-[70vh] overflow-y-auto">
              {list.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4">No teams match.</p>
              ) : (
                list.map((t) => {
                  const total = totalFor(t.studentUserId)
                  const active = t.studentUserId === selected
                  return (
                    <button
                      key={t.studentUserId}
                      type="button"
                      onClick={() => setSelected(t.studentUserId)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 text-left border-b border-border last:border-0",
                        "hover:bg-card transition-colors",
                        active && "bg-card",
                      )}
                    >
                      <span
                        className={cn(
                          "w-1 self-stretch rounded-full shrink-0",
                          active ? "bg-primary" : "bg-transparent",
                        )}
                      />
                      <span className="text-muted-foreground font-mono text-xs w-8 shrink-0">
                        #{t.loginId}
                      </span>
                      <span
                        className={cn(
                          "flex-1 truncate text-sm",
                          active ? "text-primary" : "text-foreground",
                        )}
                        title={t.teamName ?? t.loginId}
                      >
                        {t.teamName?.trim() || t.loginId}
                      </span>
                      {total == null ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-primary text-xs tabular-nums">
                          <Check className="w-3 h-3" />
                          {total}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            <div className="flex-1 min-w-0 w-full border border-border rounded-lg bg-card/40 p-5">
              {!team ? (
                <p className="text-muted-foreground text-sm">Pick a team to enter its marks.</p>
              ) : (
                <MarkSheet
                  key={team.studentUserId}
                  teamLabel={`#${team.loginId} · ${team.teamName?.trim() || team.loginId}`}
                  subtitle={[
                    team.projectTitle?.trim(),
                    team.venueName,
                    team.isExtra ? "added by organisers" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  position={`${index + 1} of ${list.length}`}
                  rubric={rubric}
                  marks={marksByTeam[team.studentUserId] ?? EMPTY_MARKS}
                  onSave={(next) => saveMarks(team.studentUserId, next)}
                  hasPrev={index > 0}
                  hasNext={index < list.length - 1}
                  onStep={step}
                />
              )}
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            Marks out of {rubricTotal} save on their own as you type — there is nothing to submit.
          </p>
        </>
      )}
    </div>
  )
}
