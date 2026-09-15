"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/searchable-select"
import { cn } from "@/lib/utils"
import type { JudgingVenue, RubricRow } from "@/lib/judging"
import { averageMarks, type EvaluationRow, type Evaluator, type RubricPreset } from "@/lib/evaluation"


// A refresh that lands while a change is still saving — or moments after —
// would hand back the server's pre-save copy and briefly revert what was just
// clicked. Every mutation in this file funnels through callJudging, so
// counting them here is enough to hold the sync back until things settle.
let inFlight = 0
let lastWriteAt = 0
const writesSettled = () => inFlight === 0 && Date.now() - lastWriteAt > 3_000

async function callJudging(action: string, payload: Record<string, unknown>) {
  inFlight += 1
  try {
    const res = await fetch("/api/admin/judging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.")
    return data
  } finally {
    inFlight -= 1
    lastWriteAt = Date.now()
  }
}

interface TeamRef {
  studentUserId: string
  loginId: string
  teamName: string | null
}

/**
 * Everything the admin controls about judging rounds: the rubric each round
 * uses and which one is live, which rooms each faculty member / juror covers,
 * and every mark that has been filed — averaged per criterion, and editable.
 */
export function AdminEvaluationView({
  teams,
  venues,
  presets: initialPresets,
  evaluators: initialEvaluators,
  evaluationsByPreset: initialEvaluations,
}: {
  teams: TeamRef[]
  venues: JudgingVenue[]
  presets: RubricPreset[]
  evaluators: Evaluator[]
  evaluationsByPreset: Record<string, EvaluationRow[]>
}) {
  const router = useRouter()
  const [presets, setPresets] = useState(initialPresets)
  const [evaluators, setEvaluators] = useState(initialEvaluators)
  const [evaluations, setEvaluations] = useState(initialEvaluations)
  const [error, setError] = useState("")

  // The page refreshes itself on a timer, so the server's rounds and evaluator
  // scope always win — neither is edited in place. Filed sheets follow too,
  // except for the team currently expanded, whose inputs may be mid-edit.
  const openTeamRef = useRef<string | null>(null)
  useEffect(() => {
    if (!writesSettled()) return
    setPresets(initialPresets)
    setEvaluators(initialEvaluators)
  }, [initialPresets, initialEvaluators])
  useEffect(() => {
    if (!writesSettled()) return
    setEvaluations((cur) => {
      const open = openTeamRef.current
      if (!open) return initialEvaluations
      const merged: Record<string, EvaluationRow[]> = {}
      for (const [presetId, rows] of Object.entries(initialEvaluations)) {
        const mine = (cur[presetId] ?? []).filter((r) => r.studentUserId === open)
        merged[presetId] = [...rows.filter((r) => r.studentUserId !== open), ...mine]
      }
      return merged
    })
  }, [initialEvaluations])

  const activePreset = presets.find((p) => p.isActive) ?? null
  const [resultsPreset, setResultsPreset] = useState(activePreset?.id ?? presets[0]?.id ?? "")

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="text-destructive text-sm">{error}</p>}

      <RoundsCard
        presets={presets}
        setPresets={setPresets}
        setError={setError}
        onChanged={() => router.refresh()}
      />

      <EvaluatorsCard
        evaluators={evaluators}
        setEvaluators={setEvaluators}
        venues={venues}
        teams={teams}
        setError={setError}
      />

      <ResultsCard
        openTeamRef={openTeamRef}
        teams={teams}
        presets={presets}
        presetId={resultsPreset}
        setPresetId={setResultsPreset}
        evaluations={evaluations}
        setEvaluations={setEvaluations}
        setError={setError}
      />
    </div>
  )
}

/* ---------------------------------------------------------------- rounds -- */

/**
 * The rounds. Activating one switches the rubric students see on Guidelines,
 * the criteria on the judging-sheet PDF, and what every evaluator marks —
 * which is why only one can be active at a time.
 */
function RoundsCard({
  presets,
  setPresets,
  setError,
  onChanged,
}: {
  presets: RubricPreset[]
  setPresets: React.Dispatch<React.SetStateAction<RubricPreset[]>>
  setError: (v: string) => void
  onChanged: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)

  async function activate(id: string) {
    setError("")
    setBusy(true)
    const prev = presets
    setPresets((cur) => cur.map((p) => ({ ...p, isActive: p.id === id })))
    try {
      await callJudging("activate-preset", { id })
      onChanged()
    } catch (e) {
      setPresets(prev)
      setError(e instanceof Error ? e.message : "Could not switch rounds.")
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string, name: string, count: number) {
    const warning =
      count > 0
        ? `Delete "${name}"? The ${count} mark sheet(s) filed against it are deleted too.`
        : `Delete "${name}"?`
    if (!confirm(warning)) return
    setError("")
    try {
      await callJudging("delete-preset", { id })
      setPresets((cur) => cur.filter((p) => p.id !== id))
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the round.")
    }
  }

  return (
    <section className="border border-border rounded-lg bg-card/40 p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-2xl text-foreground">Evaluation Rounds</h2>
        <p className="text-sm text-muted-foreground mt-1">
          One round is live at a time. The live round is the rubric students see, the criteria the
          judging sheets print, and what faculty and jury mark against.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {presets.map((p) => {
          const total = p.rubric.reduce((sum, r) => sum + (Number(r.max) || 0), 0)
          const open = openId === p.id
          return (
            <div key={p.id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-card/60">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : p.id)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                  aria-expanded={open}
                >
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                      open && "rotate-180",
                    )}
                  />
                  <span className="text-foreground truncate">{p.name}</span>
                  {p.isActive && (
                    <span className="inline-flex items-center gap-1 text-primary text-[10px] uppercase tracking-[0.1em] border border-primary rounded px-1.5 py-0.5 shrink-0">
                      <Check className="w-3 h-3" /> Live
                    </span>
                  )}
                </button>
                <span className="text-muted-foreground text-xs shrink-0">
                  {p.rubric.length} criteria &middot; {total} marks
                  {p.evaluationCount > 0 && <> &middot; {p.evaluationCount} sheets</>}
                </span>
                {!p.isActive && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => activate(p.id)}
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:bg-transparent dark:border-primary dark:hover:bg-primary dark:hover:text-primary-foreground bg-transparent"
                    >
                      Make live
                    </Button>
                    <button
                      type="button"
                      onClick={() => remove(p.id, p.name, p.evaluationCount)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete this round"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              {open && (
                <div className="px-4 py-4 border-t border-border">
                  <PresetEditor
                    preset={p}
                    setPresets={setPresets}
                    setError={setError}
                    onSaved={onChanged}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {adding ? (
        <div className="border border-border rounded-lg px-4 py-4">
          <PresetEditor
            preset={{
              id: "",
              name: "",
              rubric: [{ label: "", max: 10 }],
              isActive: false,
              sortOrder: presets.length,
              evaluationCount: 0,
            }}
            setPresets={setPresets}
            setError={setError}
            onSaved={() => {
              setAdding(false)
              onChanged()
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setAdding(true)}
          className="self-start border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:bg-transparent dark:border-primary dark:hover:bg-primary dark:hover:text-primary-foreground gap-1.5 bg-transparent"
        >
          <Plus className="w-4 h-4" /> New round
        </Button>
      )}
    </section>
  )
}

/** Name + criteria for one round. A blank id means it doesn't exist yet. */
function PresetEditor({
  preset,
  setPresets,
  setError,
  onSaved,
  onCancel,
}: {
  preset: RubricPreset
  setPresets: React.Dispatch<React.SetStateAction<RubricPreset[]>>
  setError: (v: string) => void
  onSaved: () => void
  onCancel?: () => void
}) {
  const [name, setName] = useState(preset.name)
  const [rows, setRows] = useState<RubricRow[]>(
    preset.rubric.length > 0 ? preset.rubric : [{ label: "", max: 10 }],
  )
  const [busy, setBusy] = useState(false)

  const total = rows.reduce((sum, r) => sum + (Number(r.max) || 0), 0)

  function setRow(i: number, patch: Partial<RubricRow>) {
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function save() {
    setError("")
    setBusy(true)
    try {
      const clean = rows
        .map((r) => ({ label: r.label.trim(), max: Number(r.max) }))
        .filter((r) => r.label && Number.isFinite(r.max) && r.max > 0)
      if (clean.length === 0) throw new Error("Add at least one criterion.")
      const { id } = await callJudging("save-preset", {
        id: preset.id || null,
        name,
        rubric: clean,
      })
      setPresets((cur) => {
        const saved: RubricPreset = {
          ...preset,
          id: preset.id || String(id),
          name: name.trim(),
          rubric: clean,
        }
        return cur.some((p) => p.id === saved.id)
          ? cur.map((p) => (p.id === saved.id ? saved : p))
          : [...cur, saved]
      })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the round.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 w-full sm:max-w-xs">
        <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Round name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Final Evaluation"
          className="bg-card border-border text-foreground h-10"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Criteria</Label>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={r.label}
              onChange={(e) => setRow(i, { label: e.target.value })}
              placeholder="Criterion"
              className="bg-card border-border text-foreground h-9 flex-1"
            />
            <Input
              type="number"
              min={1}
              value={r.max}
              onChange={(e) => setRow(i, { max: Number(e.target.value) })}
              className="bg-card border-border text-foreground h-9 w-20 text-center tabular-nums"
            />
            <button
              type="button"
              onClick={() => setRows((cur) => cur.filter((_, idx) => idx !== i))}
              disabled={rows.length === 1}
              className="text-muted-foreground hover:text-destructive disabled:opacity-40"
              title="Remove criterion"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((cur) => [...cur, { label: "", max: 10 }])}
          className="self-start inline-flex items-center gap-1 text-primary text-sm hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add criterion
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-sm text-muted-foreground">
          Total <span className="text-foreground font-medium tabular-nums">{total}</span> marks
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={busy}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-transparent dark:hover:bg-transparent"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={busy || !name.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "Saving…" : "Save round"}
          </Button>
        </div>
      </div>
      {preset.isActive && (
        <p className="text-muted-foreground text-xs">
          This is the live round — saving changes what students and evaluators see right away.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ evaluators -- */

/**
 * Who marks whom. An evaluator sees the teams presenting in the venues ticked
 * here; individual teams can be added on top when someone has to cover a team
 * from another room.
 */
function EvaluatorsCard({
  evaluators,
  setEvaluators,
  venues,
  teams,
  setError,
}: {
  evaluators: Evaluator[]
  setEvaluators: React.Dispatch<React.SetStateAction<Evaluator[]>>
  venues: JudgingVenue[]
  teams: TeamRef[]
  setError: (v: string) => void
}) {
  const teamLabel = useMemo(() => {
    const m = new Map(teams.map((t) => [t.studentUserId, `#${t.loginId} · ${t.teamName ?? ""}`]))
    return (id: string) => m.get(id) ?? id
  }, [teams])

  const teamOptions = useMemo(
    () =>
      teams.map((t) => ({
        value: t.studentUserId,
        label: `#${t.loginId} · ${t.teamName?.trim() || t.loginId}`,
      })),
    [teams],
  )

  async function setScope(
    evaluator: Evaluator,
    action: "set-evaluator-venues" | "set-evaluator-teams",
    ids: string[],
  ) {
    setError("")
    const prev = evaluators
    setEvaluators((cur) =>
      cur.map((e) =>
        e.userId === evaluator.userId
          ? action === "set-evaluator-venues"
            ? { ...e, venueIds: ids }
            : { ...e, teamIds: ids }
          : e,
      ),
    )
    try {
      await callJudging(action, { evaluatorUserId: evaluator.userId, ids })
    } catch (e) {
      setEvaluators(prev)
      setError(e instanceof Error ? e.message : "Could not save.")
    }
  }

  return (
    <section className="border border-border rounded-lg bg-card/40 p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-2xl text-foreground">Faculty &amp; Jury</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tick the rooms each evaluator covers — they mark the teams presenting there. Add
          individual teams below that for anything off-book. Accounts are created under User
          Management with the role Faculty or External Jury.
        </p>
      </div>

      {evaluators.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No faculty or jury accounts yet. Add them from User Management.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {evaluators.map((e) => (
            <div key={e.userId} className="border border-border rounded-lg p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-foreground">{e.name?.trim() || e.loginId}</span>
                <span className="text-muted-foreground font-mono text-xs">{e.loginId}</span>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.1em] border rounded px-1.5 py-0.5",
                    e.role === "jury"
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {e.role === "jury" ? "External Jury" : "Faculty"}
                </span>
                <span className="text-muted-foreground text-xs ml-auto">
                  {e.evaluatedCount} marked this round
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {venues.map((v) => {
                  const on = e.venueIds.includes(v.id)
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() =>
                        setScope(
                          e,
                          "set-evaluator-venues",
                          on ? e.venueIds.filter((id) => id !== v.id) : [...e.venueIds, v.id],
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        on
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {v.name}
                    </button>
                  )
                })}
                {venues.length === 0 && (
                  <span className="text-muted-foreground text-xs">
                    No judging venues yet — add them on Submissions.
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {e.teamIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-foreground"
                  >
                    {teamLabel(id)}
                    <button
                      type="button"
                      onClick={() =>
                        setScope(
                          e,
                          "set-evaluator-teams",
                          e.teamIds.filter((t) => t !== id),
                        )
                      }
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove team"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="w-full sm:w-64">
                  <SearchableSelect
                    value=""
                    onChange={(v) => v && setScope(e, "set-evaluator-teams", [...new Set([...e.teamIds, v])])}
                    options={teamOptions.filter((o) => !e.teamIds.includes(o.value))}
                    allLabel="Add an extra team…"
                    placeholder="Team name or login ID…"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* --------------------------------------------------------------- results -- */

/**
 * Every sheet filed for a round. Each team shows the average of its
 * evaluators — per criterion, not just the total, so a disagreement on one
 * criterion is visible — and any individual mark can be corrected in place.
 */
function ResultsCard({
  openTeamRef,
  teams,
  presets,
  presetId,
  setPresetId,
  evaluations,
  setEvaluations,
  setError,
}: {
  /** Tells the page-level refresh which team's sheets not to overwrite. */
  openTeamRef: React.MutableRefObject<string | null>
  teams: TeamRef[]
  presets: RubricPreset[]
  presetId: string
  setPresetId: (v: string) => void
  evaluations: Record<string, EvaluationRow[]>
  setEvaluations: React.Dispatch<React.SetStateAction<Record<string, EvaluationRow[]>>>
  setError: (v: string) => void
}) {
  const [openTeam, setOpenTeam] = useState<string | null>(null)
  useEffect(() => {
    openTeamRef.current = openTeam
  }, [openTeam, openTeamRef])
  const preset = presets.find((p) => p.id === presetId) ?? null
  const rows = evaluations[presetId] ?? []

  const byTeam = useMemo(() => {
    const m = new Map<string, EvaluationRow[]>()
    for (const r of rows) {
      const list = m.get(r.studentUserId) ?? []
      list.push(r)
      m.set(r.studentUserId, list)
    }
    return m
  }, [rows])

  const rubricTotal = preset?.rubric.reduce((sum, r) => sum + (Number(r.max) || 0), 0) ?? 0

  /** Teams with at least one sheet, best average first. */
  const scored = useMemo(
    () =>
      teams
        .filter((t) => (byTeam.get(t.studentUserId)?.length ?? 0) > 0)
        .map((t) => {
          const sheets = byTeam.get(t.studentUserId) ?? []
          return { team: t, sheets, ...averageMarks(sheets, preset?.rubric ?? []) }
        })
        .sort((a, b) => (b.average ?? 0) - (a.average ?? 0)),
    [teams, byTeam, preset],
  )

  async function saveSheet(row: EvaluationRow, marks: Record<string, number>) {
    setError("")
    const prev = evaluations[presetId] ?? []
    const total = Object.values(marks).reduce((a, b) => a + b, 0)
    setEvaluations((cur) => ({
      ...cur,
      [presetId]:
        Object.keys(marks).length === 0
          ? prev.filter(
              (r) =>
                !(
                  r.evaluatorUserId === row.evaluatorUserId &&
                  r.studentUserId === row.studentUserId
                ),
            )
          : prev.map((r) =>
              r.evaluatorUserId === row.evaluatorUserId && r.studentUserId === row.studentUserId
                ? { ...r, marks, total }
                : r,
            ),
    }))
    try {
      await callJudging("set-evaluation", {
        presetId,
        evaluatorUserId: row.evaluatorUserId,
        studentUserId: row.studentUserId,
        marks,
      })
    } catch (e) {
      setEvaluations((cur) => ({ ...cur, [presetId]: prev }))
      setError(e instanceof Error ? e.message : "Could not save the marks.")
    }
  }

  return (
    <section className="border border-border rounded-lg bg-card/40 p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Results</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Each team&apos;s average across its evaluators. Open a team to see every sheet, and
            correct any mark in place.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 w-full sm:max-w-[240px]">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Round</Label>
          <SearchableSelect
            value={presetId}
            onChange={setPresetId}
            options={presets.map((p) => ({
              value: p.id,
              label: p.isActive ? `${p.name} (live)` : p.name,
            }))}
            allLabel="Pick a round"
            placeholder="Round…"
            className="h-10"
          />
        </div>
      </div>

      {scored.length === 0 ? (
        <p className="text-muted-foreground text-sm">No marks filed for this round yet.</p>
      ) : (
        /* One card per team rather than a criterion-per-column table: a round
           can have any number of criteria, and columns would eventually run
           off the side. Here they wrap. */
        <div className="flex flex-col gap-2">
          {scored.map(({ team, sheets, perCriterion, average, count }) => {
            const open = openTeam === team.studentUserId
            return (
              <div key={team.studentUserId} className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenTeam(open ? null : team.studentUserId)}
                  aria-expanded={open}
                  className={cn(
                    "w-full text-left px-4 py-3 flex flex-col gap-2 hover:bg-card/60 transition-colors",
                    open && "bg-card/60",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0",
                        open && "rotate-180",
                      )}
                    />
                    <span className="text-foreground break-words">
                      {team.teamName?.trim() || team.loginId}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">#{team.loginId}</span>
                    <span className="text-muted-foreground text-xs">
                      {count} evaluator{count === 1 ? "" : "s"}
                    </span>
                    <span className="ml-auto shrink-0">
                      <span className="text-foreground font-medium text-lg tabular-nums">
                        {average == null ? "—" : average.toFixed(1)}
                      </span>
                      {rubricTotal > 0 && (
                        <span className="text-muted-foreground text-xs"> / {rubricTotal}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">
                    {preset?.rubric.map((r) => (
                      <span key={r.label} className="text-xs text-muted-foreground">
                        {r.label}{" "}
                        <span className="text-foreground tabular-nums">
                          {perCriterion[r.label] == null
                            ? "—"
                            : (perCriterion[r.label] as number).toFixed(1)}
                        </span>
                      </span>
                    ))}
                  </div>
                </button>

                {open && (
                  <div className="border-t border-border divide-y divide-border">
                    {sheets.map((sheet) => (
                      <SheetRow
                        key={sheet.evaluatorUserId}
                        sheet={sheet}
                        rubric={preset?.rubric ?? []}
                        rubricTotal={rubricTotal}
                        onSave={(marks) => saveSheet(sheet, marks)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** One evaluator's sheet, inline-editable by the admin. */
function SheetRow({
  sheet,
  rubric,
  rubricTotal,
  onSave,
}: {
  sheet: EvaluationRow
  rubric: RubricRow[]
  rubricTotal: number
  onSave: (marks: Record<string, number>) => Promise<void>
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rubric.map((r) => [r.label, sheet.marks[r.label] == null ? "" : String(sheet.marks[r.label])]),
    ),
  )

  const live = rubric.reduce((sum, r) => {
    const raw = (draft[r.label] ?? "").trim()
    const n = Number(raw)
    return raw !== "" && Number.isFinite(n) ? sum + n : sum
  }, 0)

  function commit() {
    const marks: Record<string, number> = {}
    for (const r of rubric) {
      const raw = (draft[r.label] ?? "").trim()
      if (raw === "") continue
      const n = Number(raw)
      if (Number.isFinite(n) && n >= 0) marks[r.label] = Math.min(n, r.max)
    }
    if (JSON.stringify(marks) === JSON.stringify(sheet.marks)) return
    onSave(marks)
  }

  return (
    <div className="px-4 py-3 bg-background/40 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-foreground text-sm break-words">
          {sheet.evaluatorName?.trim() || sheet.evaluatorLoginId}
        </span>
        <span
          className={cn(
            "text-[10px] uppercase tracking-[0.1em]",
            sheet.evaluatorRole === "jury" ? "text-primary" : "text-muted-foreground",
          )}
        >
          {sheet.evaluatorRole === "jury" ? "External Jury" : "Faculty"}
        </span>
        <span className="text-muted-foreground text-xs ml-auto tabular-nums">
          {live || "—"}
          {rubricTotal > 0 && <> / {rubricTotal}</>}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {rubric.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs" title={r.label}>
              {r.label}
            </span>
            <Input
              type="number"
              min={0}
              max={r.max}
              step="0.5"
              value={draft[r.label] ?? ""}
              onChange={(e) => {
                const raw = e.target.value
                const n = Number(raw)
                const capped =
                  raw === "" || !Number.isFinite(n)
                    ? raw
                    : n > r.max
                      ? String(r.max)
                      : n < 0
                        ? "0"
                        : raw
                setDraft((cur) => ({ ...cur, [r.label]: capped }))
              }}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
              }}
              placeholder="—"
              aria-label={`${r.label} — ${sheet.evaluatorLoginId}`}
              className="h-8 w-[62px] bg-card border-border text-foreground text-center tabular-nums"
            />
            <span className="text-muted-foreground text-[10px]">/ {r.max}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
