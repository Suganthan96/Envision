"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  Download,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/searchable-select"
import { formatDate } from "@/lib/format-date"
import {
  resolveJudgingVenue,
  type JudgingAssignment,
  type JudgingScope,
  type JudgingSettings,
  type JudgingVenue,
  type RubricRow,
} from "@/lib/judging"
import { downloadJudgingSheetsPdf, downloadTeamDetailsPdf } from "@/lib/judging-pdf"
import type { AdminSubmissionRow } from "@/lib/admin-directories"
import type { Domain } from "@/lib/domains"

async function callJudging(action: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/admin/judging", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.")
  return data
}

export function AdminSubmissionsView({
  rows,
  domains,
  venues: initialVenues,
  assignments: initialAssignments,
  settings: initialSettings,
}: {
  rows: AdminSubmissionRow[]
  domains: Domain[]
  venues: JudgingVenue[]
  assignments: JudgingAssignment[]
  settings: JudgingSettings
}) {
  const router = useRouter()

  const [venues, setVenues] = useState(initialVenues)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [liveSettings, setLiveSettings] = useState(initialSettings)
  const [error, setError] = useState("")

  const domainTitle = useMemo(() => {
    const m = new Map(domains.map((d) => [d.id, d.title]))
    return (id: string | null) => (id ? m.get(id) ?? id : null)
  }, [domains])

  const venueName = useMemo(() => {
    const m = new Map(venues.map((v) => [v.id, v.name]))
    return (id: string | null) => (id ? m.get(id) ?? null : null)
  }, [venues])

  const venueSelectOptions = useMemo(
    () => venues.map((v) => ({ value: v.id, label: v.name })),
    [venues],
  )

  const assignmentValue = (scope: JudgingScope, refId: string) =>
    assignments.find((a) => a.scope === scope && a.refId === refId)?.venueId ?? ""

  async function setAssignment(scope: JudgingScope, refId: string, venueId: string) {
    setError("")
    const prev = assignments
    setAssignments((cur) => {
      const rest = cur.filter((a) => !(a.scope === scope && a.refId === refId))
      return venueId ? [...rest, { scope, refId, venueId }] : rest
    })
    try {
      await callJudging("set-assignment", { scope, refId, venueId: venueId || null })
    } catch (e) {
      setAssignments(prev)
      setError(e instanceof Error ? e.message : "Could not save.")
    }
  }

  // ---- filters / search ----
  const [query, setQuery] = useState("")
  const [themeFilter, setThemeFilter] = useState("")
  const [venueFilter, setVenueFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [pdfBusy, setPdfBusy] = useState(false)

  const themeOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const r of rows) if (r.domainId) ids.add(r.domainId)
    return [...ids]
      .map((id) => ({ value: id, label: domainTitle(id) ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [rows, domainTitle])

  const mentorList = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of rows) if (r.mentorUserId) m.set(r.mentorUserId, r.mentorName ?? r.mentorUserId)
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [rows])

  const resolvedByTeam = useMemo(() => {
    const map = new Map<string, { venueId: string | null; source: JudgingScope | null }>()
    for (const r of rows) {
      map.set(
        r.studentUserId,
        resolveJudgingVenue(assignments, {
          studentUserId: r.studentUserId,
          mentorUserId: r.mentorUserId,
          domainId: r.domainId,
        }),
      )
    }
    return map
  }, [rows, assignments])

  const presVenueFilterOptions = useMemo(
    () => [...venues.map((v) => ({ value: v.id, label: v.name })), { value: "__none", label: "Unassigned" }],
    [venues],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (themeFilter && r.domainId !== themeFilter) return false
      if (venueFilter) {
        const resolved = resolvedByTeam.get(r.studentUserId)?.venueId ?? null
        if (venueFilter === "__none" ? resolved !== null : resolved !== venueFilter) return false
      }
      const submitted = Boolean(r.driveUrl)
      if (statusFilter === "submitted" && !submitted) return false
      if (statusFilter === "missing" && submitted) return false
      if (!q) return true
      return (
        (r.teamName ?? "").toLowerCase().includes(q) ||
        r.loginId.toLowerCase().includes(q) ||
        (r.mentorName ?? "").toLowerCase().includes(q) ||
        (r.venue ?? "").toLowerCase().includes(q)
      )
    })
  }, [rows, query, themeFilter, venueFilter, statusFilter, resolvedByTeam])

  const submittedCount = rows.filter((r) => r.driveUrl).length

  /** Groups rows by resolved presentation venue, venues in their own order,
   *  an "Unassigned" bucket last. `map` turns each row into the PDF shape. */
  function groupByVenue<T>(map: (r: AdminSubmissionRow) => T): { venueName: string; teams: T[] }[] {
    const byId = new Map<string, { venueName: string; teams: T[] }>()
    const unassigned: { venueName: string; teams: T[] } = { venueName: "Unassigned", teams: [] }
    const sorted = [...rows].sort(
      (a, b) => Number(a.loginId) - Number(b.loginId) || a.loginId.localeCompare(b.loginId),
    )
    for (const r of sorted) {
      const vid = resolvedByTeam.get(r.studentUserId)?.venueId ?? null
      if (!vid) {
        unassigned.teams.push(map(r))
        continue
      }
      if (!byId.has(vid)) byId.set(vid, { venueName: venueName(vid) ?? "Venue", teams: [] })
      byId.get(vid)!.teams.push(map(r))
    }
    const ordered = venues
      .map((v) => byId.get(v.id))
      .filter((g): g is { venueName: string; teams: T[] } => Boolean(g && g.teams.length))
    if (unassigned.teams.length) ordered.push(unassigned)
    return ordered
  }

  async function withPdf(fn: () => Promise<void>) {
    setError("")
    setPdfBusy(true)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the PDF.")
    } finally {
      setPdfBusy(false)
    }
  }

  const handleDownloadPdf = () =>
    withPdf(async () => {
      const groups = groupByVenue((r) => ({
        loginId: r.loginId,
        teamName: r.teamName ?? "",
        teamLeadName: r.teamLeadName ?? "",
        projectTitle: r.projectTitle ?? "",
        domainTitle: domainTitle(r.domainId) ?? "",
      }))
      if (groups.length === 0) {
        setError("No teams to include. Add venues and assign them first.")
        return
      }
      await downloadJudgingSheetsPdf({
        heading: liveSettings.reportHeading,
        rubric: liveSettings.rubric,
        groups,
      })
    })

  const handleDownloadDetailsPdf = () =>
    withPdf(async () => {
      const groups = groupByVenue((r) => ({
        loginId: r.loginId,
        teamName: r.teamName ?? "",
        mentorName: r.mentorName ?? "",
        allocationVenue: r.venue ?? "",
      }))
      if (groups.length === 0) {
        setError("No teams to include. Add venues and assign them first.")
        return
      }
      await downloadTeamDetailsPdf({ heading: liveSettings.reportHeading, groups })
    })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{submittedCount}</span> of {rows.length} teams
          have submitted.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleDownloadDetailsPdf}
            disabled={pdfBusy}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:bg-transparent dark:border-primary dark:hover:bg-primary dark:hover:text-primary-foreground uppercase tracking-wider text-xs h-10 gap-2 bg-transparent"
          >
            <Download className="w-4 h-4" />
            {pdfBusy ? "Preparing…" : "Team Details PDF"}
          </Button>
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
            className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-xs h-10 gap-2"
          >
            <Download className="w-4 h-4" />
            {pdfBusy ? "Preparing…" : "Judging Sheets PDF"}
          </Button>
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <JudgingVenuesCard venues={venues} setVenues={setVenues} setAssignments={setAssignments} setError={setError} />

      <AssignmentsCard
        themeOptions={themeOptions}
        mentorList={mentorList}
        venueSelectOptions={venueSelectOptions}
        assignmentValue={assignmentValue}
        setAssignment={setAssignment}
      />

      <RubricCard
        settings={initialSettings}
        onSaved={(s) => {
          setLiveSettings(s)
          router.refresh()
        }}
        setError={setError}
      />

      {/* ---- submissions table ---- */}
      <div className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl text-foreground">Teams</h2>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
          <div className="flex flex-col gap-1.5 w-full sm:max-w-xs">
            <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Search</Label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Team, login ID, mentor, venue…"
              className="bg-card border-border text-foreground h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:max-w-[220px]">
            <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Theme</Label>
            <SearchableSelect
              value={themeFilter}
              onChange={setThemeFilter}
              options={themeOptions}
              allLabel="All Themes"
              placeholder="Search themes…"
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:max-w-[190px]">
            <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Presentation Venue</Label>
            <SearchableSelect
              value={venueFilter}
              onChange={setVenueFilter}
              options={presVenueFilterOptions}
              allLabel="All"
              placeholder="Search venues…"
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:max-w-[170px]">
            <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Status</Label>
            <SearchableSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "submitted", label: "Submitted" },
                { value: "missing", label: "Not submitted" },
              ]}
              allLabel="All"
              placeholder="Status…"
              className="h-10"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8">No teams match your filters.</p>
        ) : (
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-primary uppercase tracking-[0.1em] text-[10px]">
                  <th className="text-left font-medium px-4 py-3">Team</th>
                  <th className="text-left font-medium px-4 py-3">Mentor</th>
                  <th className="text-left font-medium px-4 py-3">Theme</th>
                  <th className="text-left font-medium px-4 py-3 min-w-[180px]">Presentation Venue</th>
                  <th className="text-left font-medium px-4 py-3">Drive</th>
                  <th className="text-left font-medium px-4 py-3">Canva</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const submitted = Boolean(r.driveUrl)
                  const resolved = resolvedByTeam.get(r.studentUserId) ?? { venueId: null, source: null }
                  return (
                    <tr key={r.studentUserId} className="border-b border-border last:border-0 align-top">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/team-profiles/${r.studentUserId}`}
                          className="text-foreground hover:text-primary"
                        >
                          {r.teamName?.trim() || r.loginId}
                        </Link>
                        <span className="text-muted-foreground font-mono text-xs ml-2">#{r.loginId}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.mentorName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{domainTitle(r.domainId) ?? "—"}</td>
                      <td className="px-4 py-3">
                        <SearchableSelect
                          value={assignmentValue("team", r.studentUserId)}
                          onChange={(v) => setAssignment("team", r.studentUserId, v)}
                          options={venueSelectOptions}
                          allLabel={
                            resolved.venueId && resolved.source !== "team"
                              ? `Inherited: ${venueName(resolved.venueId)} (${resolved.source})`
                              : "Not set"
                          }
                          placeholder="Search venues…"
                          className="h-9 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {r.driveUrl ? (
                          <a
                            href={r.driveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            title={r.driveUrl}
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Open
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.canvaUrl ? (
                          <a
                            href={r.canvaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            title={r.canvaUrl}
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Open
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {submitted ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <CheckCircle2 className="w-4 h-4" /> Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Circle className="w-4 h-4" /> —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(r.updatedAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function JudgingVenuesCard({
  venues,
  setVenues,
  setAssignments,
  setError,
}: {
  venues: JudgingVenue[]
  setVenues: React.Dispatch<React.SetStateAction<JudgingVenue[]>>
  setAssignments: React.Dispatch<React.SetStateAction<JudgingAssignment[]>>
  setError: (v: string) => void
}) {
  const [newName, setNewName] = useState("")
  const [busy, setBusy] = useState(false)

  async function add() {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    setError("")
    try {
      const { venue } = await callJudging("add-venue", { name })
      setVenues((cur) => [...cur, { id: venue.id, name: venue.name, sortOrder: venue.sort_order }])
      setNewName("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add venue.")
    } finally {
      setBusy(false)
    }
  }

  async function rename(id: string, name: string) {
    setError("")
    try {
      await callJudging("rename-venue", { id, name })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename venue.")
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this judging venue? Any assignments to it are cleared.")) return
    setError("")
    try {
      await callJudging("delete-venue", { id })
      setVenues((cur) => cur.filter((v) => v.id !== id))
      setAssignments((cur) => cur.filter((a) => a.venueId !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete venue.")
    }
  }

  return (
    <section className="border border-border rounded-lg bg-card/40 p-5 flex flex-col gap-4">
      <h2 className="font-serif text-2xl text-foreground">Judging Venues</h2>
      <p className="text-sm text-muted-foreground -mt-2">
        Rooms teams present in. Separate from the allocation venues on Mentor Matching.
      </p>

      {venues.length > 0 && (
        <div className="flex flex-col gap-2">
          {venues.map((v) => (
            <VenueRow key={v.id} venue={v} onRename={rename} onRemove={remove} setVenues={setVenues} />
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5 flex-1 max-w-xs">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Add a venue</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="e.g. Seminar Hall A"
            className="bg-card border-border text-foreground h-10"
          />
        </div>
        <Button
          type="button"
          onClick={add}
          disabled={busy || !newName.trim()}
          variant="outline"
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:bg-transparent dark:border-primary dark:hover:bg-primary dark:hover:text-primary-foreground h-10 gap-1.5 bg-transparent"
        >
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
    </section>
  )
}

function VenueRow({
  venue,
  onRename,
  onRemove,
  setVenues,
}: {
  venue: JudgingVenue
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
  setVenues: React.Dispatch<React.SetStateAction<JudgingVenue[]>>
}) {
  const [name, setName] = useState(venue.name)
  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setVenues((cur) => cur.map((v) => (v.id === venue.id ? { ...v, name: e.target.value } : v)))
        }}
        onBlur={() => name.trim() && name.trim() !== venue.name && onRename(venue.id, name.trim())}
        className="bg-card border-border text-foreground h-9 max-w-xs"
      />
      <button
        type="button"
        onClick={() => onRemove(venue.id)}
        className="text-muted-foreground hover:text-destructive shrink-0 p-1"
        aria-label="Delete venue"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function AssignmentsCard({
  themeOptions,
  mentorList,
  venueSelectOptions,
  assignmentValue,
  setAssignment,
}: {
  themeOptions: { value: string; label: string }[]
  mentorList: { id: string; name: string }[]
  venueSelectOptions: { value: string; label: string }[]
  assignmentValue: (scope: JudgingScope, refId: string) => string
  setAssignment: (scope: JudgingScope, refId: string, venueId: string) => void
}) {
  return (
    <section className="border border-border rounded-lg bg-card/40 p-5 flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-2xl text-foreground">Presentation Venue Assignment</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Layered — a team uses its own venue if set, otherwise its mentor&apos;s, otherwise its
          theme&apos;s.
        </p>
      </div>

      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-primary tracking-[0.1em] uppercase text-[11px] list-none">
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
          By Theme ({themeOptions.length})
        </summary>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
          {themeOptions.map((t) => (
            <div key={t.value} className="flex items-center gap-3">
              <span className="text-sm text-foreground flex-1 truncate">{t.label}</span>
              <SearchableSelect
                value={assignmentValue("theme", t.value)}
                onChange={(v) => setAssignment("theme", t.value, v)}
                options={venueSelectOptions}
                allLabel="Not set"
                placeholder="Search venues…"
                className="h-9 w-44 text-xs"
              />
            </div>
          ))}
        </div>
      </details>

      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-primary tracking-[0.1em] uppercase text-[11px] list-none">
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
          By Mentor ({mentorList.length})
        </summary>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
          {mentorList.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <span className="text-sm text-foreground flex-1 truncate">{m.name}</span>
              <SearchableSelect
                value={assignmentValue("mentor", m.id)}
                onChange={(v) => setAssignment("mentor", m.id, v)}
                options={venueSelectOptions}
                allLabel="Not set"
                placeholder="Search venues…"
                className="h-9 w-44 text-xs"
              />
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function RubricCard({
  settings,
  onSaved,
  setError,
}: {
  settings: JudgingSettings
  onSaved: (s: JudgingSettings) => void
  setError: (v: string) => void
}) {
  const [heading, setHeading] = useState(settings.reportHeading)
  const [rubric, setRubric] = useState<RubricRow[]>(settings.rubric)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const total = rubric.reduce((s, r) => s + (Number(r.max) || 0), 0)

  function update(i: number, patch: Partial<RubricRow>) {
    setRubric((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
    setSaved(false)
  }

  async function save() {
    setBusy(true)
    setError("")
    setSaved(false)
    try {
      const cleanRubric = rubric.map((r) => ({ label: r.label.trim(), max: Number(r.max) }))
      await callJudging("save-settings", { heading: heading.trim(), rubric: cleanRubric })
      setSaved(true)
      onSaved({ reportHeading: heading.trim(), rubric: cleanRubric })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border border-border rounded-lg bg-card/40 p-5 flex flex-col gap-4">
      <h2 className="font-serif text-2xl text-foreground">Rubric &amp; Report Heading</h2>

      <div className="flex flex-col gap-1.5 max-w-lg">
        <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">PDF Heading</Label>
        <Input
          value={heading}
          onChange={(e) => {
            setHeading(e.target.value)
            setSaved(false)
          }}
          className="bg-card border-border text-foreground h-10"
        />
      </div>

      <div className="flex flex-col gap-2 max-w-lg">
        <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Rubric Rows</Label>
        {rubric.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={r.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Criterion"
              className="bg-card border-border text-foreground h-9 flex-1"
            />
            <Input
              type="number"
              min={1}
              value={r.max}
              onChange={(e) => update(i, { max: Number(e.target.value) })}
              className="bg-card border-border text-foreground h-9 w-20"
            />
            <button
              type="button"
              onClick={() => {
                setRubric((cur) => cur.filter((_, idx) => idx !== i))
                setSaved(false)
              }}
              className="text-muted-foreground hover:text-destructive shrink-0 p-1"
              aria-label="Remove row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRubric((cur) => [...cur, { label: "", max: 10 }])
              setSaved(false)
            }}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:bg-transparent dark:border-primary dark:hover:bg-primary dark:hover:text-primary-foreground h-8 gap-1.5 bg-transparent text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add row
          </Button>
          <span className="text-sm text-muted-foreground">
            Total: <span className="text-foreground font-medium">{total}</span>
          </span>
        </div>
      </div>

      <Button
        type="button"
        onClick={save}
        disabled={busy}
        className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-xs h-10 self-start px-6"
      >
        {busy ? "Saving…" : saved ? "Saved" : "Save Rubric & Heading"}
      </Button>
    </section>
  )
}
