"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/searchable-select"
import { MarkSheet } from "@/components/mark-sheet"
import { cn } from "@/lib/utils"
import {
  resolveJudgingVenue,
  type JudgingAssignment,
  type JudgingSettings,
  type JudgingVenue,
  type RubricRow,
} from "@/lib/judging"
import type { AdminSubmissionRow } from "@/lib/admin-directories"

// A refresh landing mid-save would hand back the server's pre-save marks, so
// the sync below waits until saving has settled.
let inFlight = 0
let lastWriteAt = 0
const writesSettled = () => inFlight === 0 && Date.now() - lastWriteAt > 3_000

async function saveScores(studentUserId: string, marks: Record<string, number>) {
  inFlight += 1
  try {
    const res = await fetch("/api/admin/judging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-scores", studentUserId, marks }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.")
    return data
  } finally {
    inFlight -= 1
    lastWriteAt = Date.now()
  }
}

/** Stable identity so the editor's re-sync effect doesn't fire every render. */
const EMPTY_MARKS: Record<string, number> = {}

/**
 * The judging console. Teams present room by room, so the venue filter narrows
 * the list to the room you're sitting in and the panel then walks straight down
 * it: mark a team, "Save & next" moves to the one after. Every team stays one
 * click away in the list, and the list shows at a glance who is still unmarked.
 */
export function AdminScoresView({
  rows,
  venues,
  assignments,
  settings,
}: {
  rows: AdminSubmissionRow[]
  venues: JudgingVenue[]
  assignments: JudgingAssignment[]
  settings: JudgingSettings
}) {
  const [breakdowns, setBreakdowns] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(rows.map((r) => [r.studentUserId, r.scoreBreakdown ?? {}])),
  )
  const [selected, setSelected] = useState("")
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [venueFilter, setVenueFilter] = useState("")

  // Read through a ref so the refresh-sync below doesn't re-run on selection.
  const selectedRef = useRef(selected)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  // The page refreshes itself on a timer. Adopt the server's marks for every
  // team except the one open in the sheet, which would wipe an entry in
  // progress.
  const serverKey = JSON.stringify(rows.map((r) => [r.studentUserId, r.scoreBreakdown ?? {}]))
  useEffect(() => {
    if (!writesSettled()) return
    setBreakdowns((cur) => {
      const next = { ...cur }
      for (const r of rows) {
        if (r.studentUserId === selectedRef.current) continue
        next[r.studentUserId] = r.scoreBreakdown ?? {}
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey])

  /** Marks available per the current rubric — the "/ 50" beside each total. */
  const rubricTotal = useMemo(
    () => settings.rubric.reduce((sum, row) => sum + (Number(row.max) || 0), 0),
    [settings.rubric],
  )

  /** A team's total, summed from whatever criteria have been filled in.
   *  null (not 0) while nothing has been entered at all. */
  function totalFor(studentUserId: string): number | null {
    const marks = breakdowns[studentUserId]
    if (!marks) return null
    const values = Object.values(marks)
    if (values.length === 0) return null
    return values.reduce((sum, v) => sum + v, 0)
  }

  async function saveMarks(studentUserId: string, next: Record<string, number>) {
    setError("")
    const prev = breakdowns[studentUserId] ?? {}
    setBreakdowns((cur) => ({ ...cur, [studentUserId]: next }))
    try {
      await saveScores(studentUserId, next)
    } catch (e) {
      setBreakdowns((cur) => ({ ...cur, [studentUserId]: prev }))
      setError(e instanceof Error ? e.message : "Could not save the marks.")
    }
  }

  const venueName = useMemo(() => {
    const m = new Map(venues.map((v) => [v.id, v.name]))
    return (id: string | null) => (id ? m.get(id) ?? null : null)
  }, [venues])

  /** Presentation room per team, inherited from mentor/theme where not set. */
  const venueByTeam = useMemo(() => {
    const m = new Map<string, string | null>()
    for (const r of rows) {
      m.set(
        r.studentUserId,
        resolveJudgingVenue(
          assignments,
          { studentUserId: r.studentUserId, mentorUserId: r.mentorUserId, domainId: r.domainId },
          "judging",
        ).venueId,
      )
    }
    return m
  }, [rows, assignments])

  const venueOptions = useMemo(
    () => [
      ...venues.map((v) => ({ value: v.id, label: v.name })),
      { value: "none", label: "No venue set" },
    ],
    [venues],
  )

  /** The room's running order: the list the panel walks down. */
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...rows]
      .filter((r) => {
        const vid = venueByTeam.get(r.studentUserId) ?? null
        if (venueFilter === "none" ? vid !== null : venueFilter && vid !== venueFilter) return false
        if (!q) return true
        return [r.loginId, r.teamName, r.mentorName, r.projectTitle]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      })
      .sort(
        (a, b) => Number(a.loginId) - Number(b.loginId) || a.loginId.localeCompare(b.loginId),
      )
  }, [rows, query, venueFilter, venueByTeam])

  // Keep a team selected as the filters move, so the panel is never empty for
  // no reason — and so switching rooms lands on that room's first team.
  useEffect(() => {
    if (list.length === 0) {
      setSelected("")
      return
    }
    setSelected((cur) => (list.some((r) => r.studentUserId === cur) ? cur : list[0].studentUserId))
  }, [list])

  const index = list.findIndex((r) => r.studentUserId === selected)
  const row = index >= 0 ? list[index] : null

  function step(delta: number) {
    const next = list[index + delta]
    if (next) setSelected(next.studentUserId)
  }

  const scoredCount = useMemo(
    () => rows.filter((r) => totalFor(r.studentUserId) != null).length,
    [rows, breakdowns],
  )
  const scoredHere = list.filter((r) => totalFor(r.studentUserId) != null).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5 w-full sm:max-w-[220px]">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Venue</Label>
          <SearchableSelect
            value={venueFilter}
            onChange={setVenueFilter}
            options={venueOptions}
            allLabel="All venues"
            placeholder="Search venues…"
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full sm:max-w-xs">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Search</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Team, login ID, mentor…"
            className="bg-card border-border text-foreground h-10"
          />
        </div>
        <p className="text-sm text-muted-foreground pb-2.5 ml-auto">
          <span className="text-foreground font-medium">{scoredHere}</span> of {list.length} scored
          {(venueFilter || query) && (
            <span className="text-xs"> &middot; {scoredCount} of {rows.length} overall</span>
          )}
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* running order — click any team, or use Prev/Next in the panel */}
        <div className="w-full lg:w-72 shrink-0 border border-border rounded-lg bg-card/40 max-h-[70vh] overflow-y-auto">
          {list.length === 0 ? (
            <p className="text-muted-foreground text-sm p-4">No teams match.</p>
          ) : (
            list.map((r) => {
              const total = totalFor(r.studentUserId)
              const active = r.studentUserId === selected
              return (
                <button
                  key={r.studentUserId}
                  type="button"
                  onClick={() => setSelected(r.studentUserId)}
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
                    #{r.loginId}
                  </span>
                  <span
                    className={cn(
                      "flex-1 truncate text-sm",
                      active ? "text-primary" : "text-foreground",
                    )}
                    title={r.teamName?.trim() || r.loginId}
                  >
                    {r.teamName?.trim() || r.loginId}
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

        {/* mark entry for the highlighted team */}
        <div className="flex-1 min-w-0 w-full border border-border rounded-lg bg-card/40 p-5">
          {!row ? (
            <p className="text-muted-foreground text-sm">Pick a team to enter its marks.</p>
          ) : settings.rubric.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No rubric criteria yet — add them under Judging Rubric on the Submissions page.
            </p>
          ) : (
            <MarkSheet
              key={row.studentUserId}
              teamLabel={`#${row.loginId} · ${row.teamName?.trim() || row.loginId}`}
              subtitle={[venueName(venueByTeam.get(row.studentUserId) ?? null), row.mentorName]
                .filter(Boolean)
                .join(" · ")}
              position={`${index + 1} of ${list.length}`}
              rubric={settings.rubric}
              marks={breakdowns[row.studentUserId] ?? EMPTY_MARKS}
              onSave={(next) => saveMarks(row.studentUserId, next)}
              hasPrev={index > 0}
              hasNext={index < list.length - 1}
              onStep={step}
            />
          )}
        </div>
      </div>
    </div>
  )
}
