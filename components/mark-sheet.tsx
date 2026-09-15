"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { RubricRow } from "@/lib/judging"

/**
 * Mark entry for one team: one input per rubric criterion, totalled live as
 * they are filled in. Each input commits on blur, so marks can be typed
 * straight down the list with Tab — and Enter on the last one saves and moves
 * to the next team. Criteria left blank are simply not counted, so a
 * partly-judged team still totals correctly.
 */
export function MarkSheet({
  teamLabel,
  subtitle,
  position,
  rubric,
  marks,
  onSave,
  hasPrev,
  hasNext,
  onStep,
}: {
  teamLabel: string
  subtitle: string
  position: string
  rubric: RubricRow[]
  marks: Record<string, number>
  onSave: (marks: Record<string, number>) => Promise<void>
  hasPrev: boolean
  hasNext: boolean
  onStep: (delta: number) => void
}) {
  const toDraft = (source: Record<string, number>) =>
    Object.fromEntries(
      rubric.map((row) => [row.label, source[row.label] == null ? "" : String(source[row.label])]),
    ) as Record<string, string>

  const [draft, setDraft] = useState(() => toDraft(marks))
  const [busy, setBusy] = useState(false)
  // One ref per criterion, so Enter can walk the focus down the list.
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  // Land the cursor in the first criterion whenever the team changes, so a
  // whole team can be marked without touching the mouse.
  useEffect(() => inputs.current[0]?.focus(), [])

  // Re-sync when the saved marks change underneath — but only when they come
  // back as something other than what we last sent, i.e. a failed save rolled
  // them back. Our own saves resolve into the marks we already show, and
  // re-syncing on those would wipe the criterion being typed next.
  const marksKey = JSON.stringify(marks)
  const submitted = useRef(marksKey)
  useEffect(() => {
    if (marksKey === submitted.current) return
    submitted.current = marksKey
    setDraft(toDraft(marks))
  }, [marksKey])

  const rubricTotal = rubric.reduce((sum, row) => sum + (Number(row.max) || 0), 0)

  /** Live total of whatever has been typed so far. */
  const liveTotal = rubric.reduce((sum, row) => {
    const raw = (draft[row.label] ?? "").trim()
    if (raw === "") return sum
    const n = Number(raw)
    return Number.isFinite(n) ? sum + n : sum
  }, 0)
  const anyFilled = rubric.some((row) => (draft[row.label] ?? "").trim() !== "")
  const filledCount = rubric.filter((row) => (draft[row.label] ?? "").trim() !== "").length

  function draftToMarks(source: Record<string, string>) {
    const next: Record<string, number> = {}
    for (const row of rubric) {
      const raw = (source[row.label] ?? "").trim()
      if (raw === "") continue
      const n = Number(raw)
      if (Number.isFinite(n) && n >= 0) next[row.label] = Math.min(n, row.max)
    }
    return next
  }

  async function commit(source = draft) {
    const next = draftToMarks(source)
    const nextKey = JSON.stringify(next)
    if (nextKey === JSON.stringify(marks)) return
    submitted.current = nextKey
    setBusy(true)
    try {
      await onSave(next)
    } finally {
      setBusy(false)
    }
  }

  async function clearAll() {
    const blank = Object.fromEntries(rubric.map((row) => [row.label, ""])) as Record<string, string>
    setDraft(blank)
    submitted.current = "{}"
    setBusy(true)
    try {
      await onSave({})
    } finally {
      setBusy(false)
    }
  }

  async function saveAndStep(delta: number) {
    await commit()
    onStep(delta)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl text-foreground truncate">{teamLabel}</h2>
          {subtitle && <p className="text-muted-foreground text-sm mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted-foreground text-xs tabular-nums">{position}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous team"
            onClick={() => saveAndStep(-1)}
            disabled={busy || !hasPrev}
            className="h-9 w-9 border-border text-foreground hover:text-primary hover:bg-transparent dark:hover:bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next team"
            onClick={() => saveAndStep(1)}
            disabled={busy || !hasNext}
            className="h-9 w-9 border-border text-foreground hover:text-primary hover:bg-transparent dark:hover:bg-transparent"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {rubric.map((row, i) => {
          const raw = (draft[row.label] ?? "").trim()
          const n = Number(raw)
          const overMax = raw !== "" && Number.isFinite(n) && n > row.max
          const last = i === rubric.length - 1
          return (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 min-w-0 border-b border-border/60 last:border-0 pb-2 last:pb-0"
            >
              <span className="text-foreground text-sm truncate" title={row.label}>
                {row.label}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Input
                  ref={(el) => {
                    inputs.current[i] = el
                  }}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={row.max}
                  step="0.5"
                  value={draft[row.label] ?? ""}
                  onChange={(e) => {
                    // A mark can never exceed the criterion's maximum: typing
                    // past it pins the field at the max rather than letting a
                    // bad total through.
                    const raw = e.target.value
                    const n = Number(raw)
                    const capped =
                      raw === "" || !Number.isFinite(n)
                        ? raw
                        : n > row.max
                          ? String(row.max)
                          : n < 0
                            ? "0"
                            : raw
                    setDraft((cur) => ({ ...cur, [row.label]: capped }))
                  }}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={() => commit()}
                  onKeyDown={(e) => {
                    // Enter walks down the criteria — moving the focus blurs
                    // this input, which is what commits the mark — and on the
                    // last one carries on to the next team.
                    if (e.key !== "Enter") return
                    e.preventDefault()
                    if (last) saveAndStep(1)
                    else inputs.current[i + 1]?.focus()
                  }}
                  placeholder="—"
                  aria-label={row.label}
                  title={overMax ? `Above the maximum of ${row.max}` : undefined}
                  className={cn(
                    "h-10 w-[80px] bg-card border-border text-foreground text-center tabular-nums text-base",
                    overMax && "border-destructive text-destructive",
                  )}
                />
                <span className="text-muted-foreground text-xs w-8">/ {row.max}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm">
          <span className="text-primary tracking-[0.1em] uppercase text-[10px] mr-2">Total</span>
          <span className="text-foreground font-medium text-2xl tabular-nums">
            {anyFilled ? liveTotal : "—"}
          </span>
          {rubricTotal > 0 && <span className="text-muted-foreground text-xs ml-1">/ {rubricTotal}</span>}
          <span className="text-muted-foreground text-xs ml-3">
            {filledCount} of {rubric.length} criteria
          </span>
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={busy || !anyFilled}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-transparent dark:hover:bg-transparent"
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => saveAndStep(1)}
            disabled={busy || !hasNext}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          >
            Save &amp; next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
