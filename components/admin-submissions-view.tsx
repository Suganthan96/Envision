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
  type VenueKind,
} from "@/lib/judging"
import {
  downloadJudgingSheetsPdf,
  downloadTeamDetailsPdf,
  downloadFacultyPdf,
} from "@/lib/judging-pdf"
import { downloadSubmissionsXlsx } from "@/lib/submissions-xlsx"
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
  waitingVenues: initialWaitingVenues,
  assignments: initialAssignments,
  settings: initialSettings,
}: {
  rows: AdminSubmissionRow[]
  domains: Domain[]
  venues: JudgingVenue[]
  waitingVenues: JudgingVenue[]
  assignments: JudgingAssignment[]
  settings: JudgingSettings
}) {
  const router = useRouter()

  const [venues, setVenues] = useState(initialVenues)
  const [waitingVenues, setWaitingVenues] = useState(initialWaitingVenues)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [liveSettings, setLiveSettings] = useState(initialSettings)
  const [error, setError] = useState("")

  const domainTitle = useMemo(() => {
    const m = new Map(domains.map((d) => [d.id, d.title]))
    return (id: string | null) => (id ? m.get(id) ?? id : null)
  }, [domains])

  const venueName = useMemo(() => {
    const m = new Map([...venues, ...waitingVenues].map((v) => [v.id, v.name]))
    return (id: string | null) => (id ? m.get(id) ?? null : null)
  }, [venues, waitingVenues])

  const judgingVenueOptions = useMemo(
    () => venues.map((v) => ({ value: v.id, label: v.name })),
    [venues],
  )
  const waitingVenueOptions = useMemo(
    () => waitingVenues.map((v) => ({ value: v.id, label: v.name })),
    [waitingVenues],
  )

  const assignmentValue = (kind: VenueKind, scope: JudgingScope, refId: string) =>
    assignments.find((a) => a.kind === kind && a.scope === scope && a.refId === refId)?.venueId ?? ""

  async function setAssignment(kind: VenueKind, scope: JudgingScope, refId: string, venueId: string) {
    setError("")
    const prev = assignments
    setAssignments((cur) => {
      const rest = cur.filter((a) => !(a.kind === kind && a.scope === scope && a.refId === refId))
      return venueId ? [...rest, { kind, scope, refId, venueId }] : rest
    })
    try {
      await callJudging("set-assignment", { kind, scope, refId, venueId: venueId || null })
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

  function resolveMap(kind: VenueKind) {
    const map = new Map<string, { venueId: string | null; source: JudgingScope | null }>()
    for (const r of rows) {
      map.set(
        r.studentUserId,
        resolveJudgingVenue(
          assignments,
          { studentUserId: r.studentUserId, mentorUserId: r.mentorUserId, domainId: r.domainId },
          kind,
        ),
      )
    }
    return map
  }

  const resolvedByTeam = useMemo(() => resolveMap("judging"), [rows, assignments])
  const resolvedWaitingByTeam = useMemo(() => resolveMap("waiting"), [rows, assignments])

  function countMap(resolved: Map<string, { venueId: string | null }>) {
    const m = new Map<string, number>()
    let unassigned = 0
    for (const r of rows) {
      const vid = resolved.get(r.studentUserId)?.venueId ?? null
      if (vid) m.set(vid, (m.get(vid) ?? 0) + 1)
      else unassigned += 1
    }
    return { byVenue: m, unassigned }
  }

  const teamCountByVenue = useMemo(() => countMap(resolvedByTeam), [rows, resolvedByTeam])
  const waitingCountByVenue = useMemo(() => countMap(resolvedWaitingByTeam), [rows, resolvedWaitingByTeam])

  const presVenueFilterOptions = useMemo(
    () => [
      ...venues.map((v) => ({
        value: v.id,
        label: `${v.name} (${teamCountByVenue.byVenue.get(v.id) ?? 0})`,
      })),
      { value: "__none", label: `Unassigned (${teamCountByVenue.unassigned})` },
    ],
    [venues, teamCountByVenue],
  )

  // Numeric login-ID order (2 before 10), non-numeric IDs first.
  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const na = Number(a.loginId)
        const nb = Number(b.loginId)
        const aNum = a.loginId.trim() !== "" && Number.isFinite(na)
        const bNum = b.loginId.trim() !== "" && Number.isFinite(nb)
        if (aNum && bNum) return na - nb
        if (aNum) return 1
        if (bNum) return -1
        return a.loginId.localeCompare(b.loginId)
      }),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortedRows.filter((r) => {
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
  }, [sortedRows, query, themeFilter, venueFilter, statusFilter, resolvedByTeam])

  const submittedCount = rows.filter((r) => r.driveUrl).length

  /** Groups rows by resolved presentation venue, venues in their own order.
   *  Teams with no presentation venue are left out of the PDFs entirely.
   *  `map` turns each row into the PDF shape. */
  function groupByVenue<T>(map: (r: AdminSubmissionRow) => T): { venueName: string; teams: T[] }[] {
    const byId = new Map<string, { venueName: string; teams: T[] }>()
    const sorted = [...rows].sort(
      (a, b) => Number(a.loginId) - Number(b.loginId) || a.loginId.localeCompare(b.loginId),
    )
    for (const r of sorted) {
      const vid = resolvedByTeam.get(r.studentUserId)?.venueId ?? null
      if (!vid) continue
      if (!byId.has(vid)) byId.set(vid, { venueName: venueName(vid) ?? "Venue", teams: [] })
      byId.get(vid)!.teams.push(map(r))
    }
    return venues
      .map((v) => byId.get(v.id))
      .filter((g): g is { venueName: string; teams: T[] } => Boolean(g && g.teams.length))
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
        projectTitle: r.projectTitle?.trim() || (r.teamName ?? ""),
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
        teamLeadName: r.teamLeadName ?? "",
        mentorName: r.mentorName ?? "",
        waitingVenue: venueName(resolvedWaitingByTeam.get(r.studentUserId)?.venueId ?? null) ?? "",
      }))
      if (groups.length === 0) {
        setError("No teams to include. Add venues and assign them first.")
        return
      }
      await downloadTeamDetailsPdf({ heading: liveSettings.reportHeading, groups })
    })

  const handleDownloadFacultyPdf = () =>
    withPdf(async () => {
      const groups = groupByVenue((r) => ({
        loginId: r.loginId,
        domainTitle: domainTitle(r.domainId) ?? "",
        projectTitle: r.projectTitle?.trim() || (r.teamName ?? ""),
      }))
      if (groups.length === 0) {
        setError("No teams to include. Add venues and assign them first.")
        return
      }
      await downloadFacultyPdf({
        heading: liveSettings.facultyHeading,
        timing: liveSettings.facultyTiming,
        groups,
      })
    })

  const handleDownloadXlsx = () =>
    withPdf(async () => {
      const xlsxRows = [...rows]
        .map((r) => {
          const pres = venueName(resolvedByTeam.get(r.studentUserId)?.venueId ?? null) ?? ""
          const wait = venueName(resolvedWaitingByTeam.get(r.studentUserId)?.venueId ?? null) ?? ""
          return {
            presentationVenue: pres,
            loginId: r.loginId,
            teamName: r.teamName ?? "",
            teamLeadName: r.teamLeadName ?? "",
            mentorName: r.mentorName ?? "",
            waitingVenue: wait,
            domain: domainTitle(r.domainId) ?? "",
            projectTitle: r.projectTitle?.trim() || (r.teamName ?? ""),
          }
        })
        .sort(
          (a, b) =>
            // teams with a venue first, then by venue name, then by team number
            (a.presentationVenue ? 0 : 1) - (b.presentationVenue ? 0 : 1) ||
            a.presentationVenue.localeCompare(b.presentationVenue) ||
            Number(a.loginId) - Number(b.loginId) ||
            a.loginId.localeCompare(b.loginId),
        )
      await downloadSubmissionsXlsx(xlsxRows)
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
            onClick={handleDownloadXlsx}
            disabled={pdfBusy}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:bg-transparent dark:border-primary dark:hover:bg-primary dark:hover:text-primary-foreground uppercase tracking-wider text-xs h-10 gap-2 bg-transparent"
          >
            <Download className="w-4 h-4" />
            {pdfBusy ? "Preparing…" : "Excel"}
          </Button>
          <Button
            type="button"
            onClick={handleDownloadFacultyPdf}
            disabled={pdfBusy}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:bg-transparent dark:border-primary dark:hover:bg-primary dark:hover:text-primary-foreground uppercase tracking-wider text-xs h-10 gap-2 bg-transparent"
          >
            <Download className="w-4 h-4" />
            {pdfBusy ? "Preparing…" : "Faculty PDF"}
          </Button>
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

      <VenuesCard
        kind="judging"
        title="Judging Venues"
        description="Rooms teams present in. Separate from the allocation venues on Mentor Matching."
        venues={venues}
        countByVenue={teamCountByVenue.byVenue}
        setVenues={setVenues}
        setAssignments={setAssignments}
        setError={setError}
      />

      <VenuesCard
        kind="waiting"
        title="Waiting Venues"
        description="Rooms teams wait in before their slot."
        venues={waitingVenues}
        countByVenue={waitingCountByVenue.byVenue}
        setVenues={setWaitingVenues}
        setAssignments={setAssignments}
        setError={setError}
      />

      <AssignmentsCard
        title="Judging Venue Assignment"
        themeOptions={themeOptions}
        mentorList={mentorList}
        venueSelectOptions={judgingVenueOptions}
        assignmentValue={(s, r) => assignmentValue("judging", s, r)}
        setAssignment={(s, r, v) => setAssignment("judging", s, r, v)}
      />

      <AssignmentsCard
        title="Waiting Venue Assignment"
        themeOptions={themeOptions}
        mentorList={mentorList}
        venueSelectOptions={waitingVenueOptions}
        assignmentValue={(s, r) => assignmentValue("waiting", s, r)}
        setAssignment={(s, r, v) => setAssignment("waiting", s, r, v)}
      />

      <RubricCard
        settings={initialSettings}
        onSaved={(s) => {
          setLiveSettings(s)
          router.refresh()
        }}
        setError={setError}
      />

      {/* ---- submissions table (breaks out to near-full viewport width so
              the wide table fits without a horizontal scrollbar) ---- */}
      <div className="flex flex-col gap-4 relative w-[92vw] max-w-[1700px] left-1/2 -translate-x-1/2">
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
                  <th className="text-left font-medium px-3 py-3">Team</th>
                  <th className="text-left font-medium px-3 py-3">Mentor</th>
                  <th className="text-left font-medium px-3 py-3">Theme</th>
                  <th className="text-left font-medium px-3 py-3">Presentation Venue</th>
                  <th className="text-left font-medium px-3 py-3">Waiting Venue</th>
                  <th className="text-left font-medium px-3 py-3">Drive</th>
                  <th className="text-left font-medium px-3 py-3">Canva</th>
                  <th className="text-left font-medium px-3 py-3">Status</th>
                  <th className="text-left font-medium px-3 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const submitted = Boolean(r.driveUrl)
                  const resolved = resolvedByTeam.get(r.studentUserId) ?? { venueId: null, source: null }
                  const resolvedWait = resolvedWaitingByTeam.get(r.studentUserId) ?? {
                    venueId: null,
                    source: null,
                  }
                  return (
                    <tr key={r.studentUserId} className="border-b border-border last:border-0 align-top">
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/team-profiles/${r.studentUserId}`}
                          className="text-foreground hover:text-primary"
                        >
                          {r.teamName?.trim() || r.loginId}
                        </Link>
                        <span className="text-muted-foreground font-mono text-xs ml-2">#{r.loginId}</span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{r.mentorName ?? "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground max-w-[150px]">
                        <span className="block truncate" title={domainTitle(r.domainId) ?? undefined}>
                          {domainTitle(r.domainId) ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 w-[190px]">
                        <SearchableSelect
                          value={assignmentValue("judging", "team", r.studentUserId)}
                          onChange={(v) => setAssignment("judging", "team", r.studentUserId, v)}
                          options={judgingVenueOptions}
                          allLabel={
                            resolved.venueId && resolved.source !== "team"
                              ? `Inherited: ${venueName(resolved.venueId)} (${resolved.source})`
                              : "Not set"
                          }
                          placeholder="Search venues…"
                          className="h-9 text-xs"
                        />
                      </td>
                      <td className="px-3 py-3 w-[190px]">
                        <SearchableSelect
                          value={assignmentValue("waiting", "team", r.studentUserId)}
                          onChange={(v) => setAssignment("waiting", "team", r.studentUserId, v)}
                          options={waitingVenueOptions}
                          allLabel={
                            resolvedWait.venueId && resolvedWait.source !== "team"
                              ? `Inherited: ${venueName(resolvedWait.venueId)} (${resolvedWait.source})`
                              : "Not set"
                          }
                          placeholder="Search venues…"
                          className="h-9 text-xs"
                        />
                      </td>
                      <td className="px-3 py-3">
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
                      <td className="px-3 py-3">
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
                      <td className="px-3 py-3">
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
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
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

function VenuesCard({
  kind,
  title,
  description,
  venues,
  countByVenue,
  setVenues,
  setAssignments,
  setError,
}: {
  kind: VenueKind
  title: string
  description: string
  venues: JudgingVenue[]
  countByVenue: Map<string, number>
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
      const { venue } = await callJudging("add-venue", { name, kind })
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
    if (!confirm("Delete this venue? Any assignments to it are cleared.")) return
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
      <h2 className="font-serif text-2xl text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground -mt-2">{description}</p>

      {venues.length > 0 && (
        <div className="flex flex-col gap-2">
          {venues.map((v) => (
            <VenueRow
              key={v.id}
              venue={v}
              teamCount={countByVenue.get(v.id) ?? 0}
              onRename={rename}
              onRemove={remove}
              setVenues={setVenues}
            />
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
  teamCount,
  onRename,
  onRemove,
  setVenues,
}: {
  venue: JudgingVenue
  teamCount: number
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
  setVenues: React.Dispatch<React.SetStateAction<JudgingVenue[]>>
}) {
  const [name, setName] = useState(venue.name)
  return (
    <div className="flex items-center gap-3">
      <Input
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setVenues((cur) => cur.map((v) => (v.id === venue.id ? { ...v, name: e.target.value } : v)))
        }}
        onBlur={() => name.trim() && name.trim() !== venue.name && onRename(venue.id, name.trim())}
        className="bg-card border-border text-foreground h-9 max-w-xs"
      />
      <span className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
        {teamCount} {teamCount === 1 ? "team" : "teams"}
      </span>
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
  title,
  themeOptions,
  mentorList,
  venueSelectOptions,
  assignmentValue,
  setAssignment,
}: {
  title: string
  themeOptions: { value: string; label: string }[]
  mentorList: { id: string; name: string }[]
  venueSelectOptions: { value: string; label: string }[]
  assignmentValue: (scope: JudgingScope, refId: string) => string
  setAssignment: (scope: JudgingScope, refId: string, venueId: string) => void
}) {
  return (
    <section className="border border-border rounded-lg bg-card/40 p-5 flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-2xl text-foreground">{title}</h2>
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
  const [facultyHeading, setFacultyHeading] = useState(settings.facultyHeading)
  const [facultyTiming, setFacultyTiming] = useState(settings.facultyTiming)
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
      await callJudging("save-settings", {
        heading: heading.trim(),
        rubric: cleanRubric,
        facultyHeading: facultyHeading.trim(),
        facultyTiming: facultyTiming.trim(),
      })
      setSaved(true)
      onSaved({
        reportHeading: heading.trim(),
        rubric: cleanRubric,
        facultyHeading: facultyHeading.trim(),
        facultyTiming: facultyTiming.trim(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border border-border rounded-lg bg-card/40 p-5 flex flex-col gap-4">
      <h2 className="font-serif text-2xl text-foreground">Report Settings</h2>

      <div className="flex flex-col gap-1.5 max-w-lg">
        <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">
          Judging Sheets PDF Heading
        </Label>
        <Input
          value={heading}
          onChange={(e) => {
            setHeading(e.target.value)
            setSaved(false)
          }}
          className="bg-card border-border text-foreground h-10"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 max-w-lg">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Faculty PDF Title</Label>
          <Input
            value={facultyHeading}
            onChange={(e) => {
              setFacultyHeading(e.target.value)
              setSaved(false)
            }}
            className="bg-card border-border text-foreground h-10"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full sm:w-52">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Faculty PDF Timing</Label>
          <Input
            value={facultyTiming}
            onChange={(e) => {
              setFacultyTiming(e.target.value)
              setSaved(false)
            }}
            placeholder="e.g. 2:00 PM - 4:00 PM"
            className="bg-card border-border text-foreground h-10"
          />
        </div>
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
        {busy ? "Saving…" : saved ? "Saved" : "Save Report Settings"}
      </Button>
    </section>
  )
}
