"use client"

import type React from "react"
import { useMemo, useRef, useState } from "react"
import { X, Download, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Domain } from "@/lib/domains"
import { cn } from "@/lib/utils"

export interface VenueInfo {
  code: string
  teamCapacity: number
  teamCount: number
}

export interface MatchingMentor {
  mentorUserId: string
  loginId: string
  name: string | null
  venue: string | null
  domainIds: string[]
}

export interface MatchingStudent {
  studentUserId: string
  loginId: string
  teamName: string | null
  teamLeadName: string | null
  phone: string | null
  email: string | null
  venue: string | null
  domainId: string
  mentorUserId: string | null
}

function domainTitle(domains: Domain[], domainId: string) {
  return domains.find((d) => d.id === domainId)?.title ?? domainId
}

function VenuePicker({
  value,
  venues,
  onChange,
}: {
  value: string | null
  venues: VenueInfo[]
  onChange: (venue: string | null) => void
}) {
  return (
    <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
      <SelectTrigger
        className="h-6 px-2 text-[10px] uppercase tracking-wider bg-transparent border-border text-muted-foreground w-auto gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue placeholder="No Venue" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No Venue</SelectItem>
        {venues.map((v) => (
          <SelectItem key={v.code} value={v.code}>
            {v.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function VenueManager({
  venues,
  onAdd,
  onRemove,
  onSetCapacity,
}: {
  venues: VenueInfo[]
  onAdd: (code: string, capacity: number) => void
  onRemove: (code: string) => void
  onSetCapacity: (code: string, capacity: number) => void
}) {
  const [newCode, setNewCode] = useState("")
  const [newCapacity, setNewCapacity] = useState("")
  const [capacityDrafts, setCapacityDrafts] = useState<Record<string, string>>({})

  return (
    <div className="border border-border bg-card/40 p-4 flex flex-col gap-3">
      <p className="text-primary text-xs uppercase tracking-wider">Venues</p>

      <div className="flex flex-col gap-2">
        {venues.length === 0 ? (
          <p className="text-muted-foreground text-xs">No venues yet — add one below.</p>
        ) : (
          venues.map((v) => {
            const draft = capacityDrafts[v.code] ?? String(v.teamCapacity)
            const over = v.teamCount > v.teamCapacity
            return (
              <div key={v.code} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-foreground w-16 shrink-0">{v.code}</span>
                <span className={cn("text-xs shrink-0 w-20", over ? "text-destructive" : "text-muted-foreground")}>
                  {v.teamCount}/{v.teamCapacity} teams
                </span>
                <Input
                  type="number"
                  min={0}
                  value={draft}
                  onChange={(e) => setCapacityDrafts((d) => ({ ...d, [v.code]: e.target.value }))}
                  onBlur={() => {
                    const n = Number(draft)
                    if (Number.isInteger(n) && n >= 0 && n !== v.teamCapacity) onSetCapacity(v.code, n)
                  }}
                  className="bg-card border-border text-foreground h-7 text-xs w-20"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onRemove(v.code)}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground h-7 w-7 p-0 shrink-0"
                  aria-label={`Remove venue ${v.code}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )
          })
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Code (e.g. F11)"
          className="bg-card border-border text-foreground h-8 text-sm flex-1"
        />
        <Input
          type="number"
          min={0}
          value={newCapacity}
          onChange={(e) => setNewCapacity(e.target.value)}
          placeholder="Teams"
          className="bg-card border-border text-foreground h-8 text-sm w-24"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const n = Number(newCapacity)
            if (!newCode.trim() || !Number.isInteger(n) || n < 0) return
            onAdd(newCode.trim(), n)
            setNewCode("")
            setNewCapacity("")
          }}
          disabled={!newCode.trim() || newCapacity === ""}
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs uppercase tracking-wider h-8 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>
    </div>
  )
}

function TeamCard({
  student,
  compatible,
  domains,
  onDragStart,
  onRemove,
}: {
  student: MatchingStudent
  compatible: boolean | null
  domains: Domain[]
  onDragStart: (e: React.DragEvent) => void
  onRemove?: () => void
}) {
  const teamName = student.teamName?.trim()

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        "group relative p-3 border bg-card cursor-grab active:cursor-grabbing transition-colors",
        compatible === true && "border-primary/60",
        compatible === false && "border-border",
        compatible === null && "border-border",
      )}
      title={student.loginId}
    >
      <p className="text-foreground text-sm font-medium truncate pr-5">
        <span className="text-primary font-mono mr-1.5">#{student.loginId}</span>
        {teamName}
      </p>
      <p className="text-muted-foreground text-xs truncate">{domainTitle(domains, student.domainId)}</p>
      {student.venue && (
        <p className="text-muted-foreground text-[10px] uppercase tracking-wider mt-1">Venue: {student.venue}</p>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Unassign ${teamName || student.loginId}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

function MentorCard({
  mentor,
  assignedStudents,
  venues,
  domains,
  onDrop,
  onRemove,
  onVenueChange,
  dragOver,
  onDragOver,
  onDragLeave,
}: {
  mentor: MatchingMentor
  assignedStudents: MatchingStudent[]
  venues: VenueInfo[]
  domains: Domain[]
  onDrop: () => void
  onRemove: (studentUserId: string) => void
  onVenueChange: (venue: string | null) => void
  dragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
}) {
  const displayName = mentor.name?.trim() || mentor.loginId
  const full = assignedStudents.length >= 2

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(e)
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      className={cn(
        "border bg-card/40 p-4 flex flex-col gap-3 transition-colors",
        dragOver && !full && "border-primary bg-primary/5",
        dragOver && full && "border-destructive",
      )}
    >
      <div>
        <p className="text-foreground font-serif text-lg truncate">{displayName}</p>
        {mentor.name?.trim() && <p className="text-muted-foreground text-xs font-mono">{mentor.loginId}</p>}
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {mentor.domainIds.map((id) => (
            <span
              key={id}
              className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5"
            >
              {domainTitle(domains, id)}
            </span>
          ))}
        </div>
        <div className="mt-1.5">
          <VenuePicker value={mentor.venue} venues={venues} onChange={onVenueChange} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {[0, 1].map((slot) => {
          const student = assignedStudents[slot]
          if (student) {
            return (
              <TeamCard
                key={student.studentUserId}
                student={student}
                compatible={mentor.domainIds.includes(student.domainId)}
                domains={domains}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", student.studentUserId)}
                onRemove={() => onRemove(student.studentUserId)}
              />
            )
          }
          return (
            <div
              key={slot}
              className="p-3 border border-dashed border-border text-center text-muted-foreground text-xs uppercase tracking-wider"
            >
              Drop a team here
            </div>
          )
        })}
      </div>
    </div>
  )
}

type ExportRow = { mentorId: string; mentorName: string; venue: string; team: MatchingStudent }

async function downloadMentorMatchingPdf(rows: ExportRow[]) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const autoTable = autoTableModule.default

  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 40
  let y = 50

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text("ENVISION", pageWidth / 2, y, { align: "center", charSpace: 2 })

  y += 22
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(20)
  doc.text("Mentor–Student List", pageWidth / 2, y, { align: "center" })

  y += 16
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(140)
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  doc.text(`${today}`, pageWidth / 2, y, { align: "center" })

  y += 10
  doc.setDrawColor(20)
  doc.setLineWidth(1)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 24

  if (rows.length === 0) {
    doc.setFontSize(11)
    doc.setTextColor(120)
    doc.text("No mentors have any teams assigned yet.", pageWidth / 2, y, { align: "center" })
    doc.save("envision-mentor-matching.pdf")
    return
  }

  const sortedRows = [...rows].sort(
    (a, b) => a.venue.localeCompare(b.venue) || a.mentorName.localeCompare(b.mentorName),
  )

  // jspdf-autotable does not repeat rowSpan cell content when a merged group is
  // split across a page break, which left Venue/Mentor blank on later pages.
  // So instead of merging cells, repeat the label on every row (bold + a thicker
  // top border only on the first row of each group) — this stays correct no
  // matter where a page break lands.
  type Cell = string | { content: string; styles: Record<string, unknown> }
  const body: Cell[][] = []
  const groupTopBorderByRow = new Map<number, number>()
  sortedRows.forEach((r, i) => {
    const prev = sortedRows[i - 1]
    const isFirstOfVenue = i === 0 || prev.venue !== r.venue
    const isFirstOfMentor = i === 0 || prev.mentorId !== r.mentorId || isFirstOfVenue

    if (isFirstOfVenue) groupTopBorderByRow.set(i, 1.5)
    else if (isFirstOfMentor) groupTopBorderByRow.set(i, 0.75)

    body.push([
      { content: r.venue, styles: { fontStyle: isFirstOfVenue ? "bold" : "normal" } },
      { content: r.mentorName, styles: { fontStyle: isFirstOfMentor ? "bold" : "normal" } },
      r.team.loginId,
      r.team.teamName?.trim() || "—",
      r.team.teamLeadName ?? "—",
      r.team.phone ?? "—",
      r.team.email ?? "—",
    ])
  })

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Venue", "Mentor", "Team #", "Team Name", "Team Leader", "Phone", "Email"]],
    body,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6, lineColor: [20, 20, 20], lineWidth: 0.5, textColor: 20 },
    headStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 85 },
      2: { cellWidth: 55 },
      3: { cellWidth: 90 },
      4: { cellWidth: 90 },
      5: { cellWidth: 80 },
      6: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return
      const topWidth = groupTopBorderByRow.get(data.row.index)
      if (topWidth) {
        data.cell.styles.lineWidth = { top: topWidth, right: 0.5, bottom: 0.5, left: 0.5 }
      }
    },
  })

  doc.save("envision-mentor-matching.pdf")
}

export function MentorMatchingBoard({
  initialMentors,
  initialStudents,
  initialVenues,
  domains,
}: {
  initialMentors: MatchingMentor[]
  initialStudents: MatchingStudent[]
  initialVenues: VenueInfo[]
  domains: Domain[]
}) {
  const [mentors, setMentors] = useState<MatchingMentor[]>(initialMentors)
  const [students, setStudents] = useState<MatchingStudent[]>(initialStudents)
  const [venues, setVenues] = useState<VenueInfo[]>(initialVenues)
  const [query, setQuery] = useState("")
  const [mentorQuery, setMentorQuery] = useState("")
  const [dragOverMentorId, setDragOverMentorId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [themeFilter, setThemeFilter] = useState("")
  const [venueFilter, setVenueFilter] = useState("")
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const availableThemes = useMemo(() => {
    const ids = new Set<string>()
    for (const m of mentors) for (const id of m.domainIds) ids.add(id)
    for (const s of students) ids.add(s.domainId)
    return domains.filter((d) => ids.has(d.id))
  }, [mentors, students, domains])

  const visibleMentors = useMemo(() => {
    const q = mentorQuery.trim().toLowerCase()
    return mentors.filter((m) => {
      if (themeFilter && !m.domainIds.includes(themeFilter)) return false
      if (venueFilter && m.venue !== venueFilter) return false
      if (!q) return true
      const name = (m.name ?? "").toLowerCase()
      return name.includes(q) || m.loginId.toLowerCase().includes(q)
    })
  }, [mentors, themeFilter, venueFilter, mentorQuery])

  const assignedByMentor = useMemo(() => {
    const map = new Map<string, MatchingStudent[]>()
    for (const student of students) {
      if (!student.mentorUserId) continue
      const list = map.get(student.mentorUserId) ?? []
      list.push(student)
      map.set(student.mentorUserId, list)
    }
    return map
  }, [students])

  const unassigned = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter((s) => {
      if (s.mentorUserId) return false
      if (themeFilter && s.domainId !== themeFilter) return false
      if (venueFilter && s.venue !== venueFilter) return false
      if (!q) return true
      const name = (s.teamName ?? "").toLowerCase()
      return (
        name.includes(q) ||
        s.loginId.toLowerCase().includes(q) ||
        domainTitle(domains, s.domainId).toLowerCase().includes(q)
      )
    })
  }, [students, query, themeFilter, venueFilter, domains])

  const draggedStudentId = useRef<string | null>(null)

  const assign = async (studentUserId: string, mentorUserId: string | null) => {
    setError("")
    const prevStudent = students.find((s) => s.studentUserId === studentUserId)
    const prevMentorId = prevStudent?.mentorUserId ?? null
    const prevVenue = prevStudent?.venue ?? null
    const nextVenue = mentorUserId ? mentors.find((m) => m.mentorUserId === mentorUserId)?.venue ?? null : null

    setStudents((prev) =>
      prev.map((s) => (s.studentUserId === studentUserId ? { ...s, mentorUserId, venue: nextVenue } : s)),
    )
    setVenues((list) =>
      list.map((v) => {
        if (v.code === nextVenue) return { ...v, teamCount: v.teamCount + 1 }
        if (v.code === prevVenue) return { ...v, teamCount: Math.max(0, v.teamCount - 1) }
        return v
      }),
    )

    try {
      const res = await fetch("/api/admin/mentor-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUserId, mentorUserId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            s.studentUserId === studentUserId ? { ...s, mentorUserId: prevMentorId, venue: prevVenue } : s,
          ),
        )
        setVenues((list) =>
          list.map((v) => {
            if (v.code === prevVenue) return { ...v, teamCount: v.teamCount + 1 }
            if (v.code === nextVenue) return { ...v, teamCount: Math.max(0, v.teamCount - 1) }
            return v
          }),
        )
        setError(data.error ?? "Unable to update assignment.")
      }
    } catch {
      setStudents((prev) =>
        prev.map((s) =>
          s.studentUserId === studentUserId ? { ...s, mentorUserId: prevMentorId, venue: prevVenue } : s,
        ),
      )
      setVenues((list) =>
        list.map((v) => {
          if (v.code === prevVenue) return { ...v, teamCount: v.teamCount + 1 }
          if (v.code === nextVenue) return { ...v, teamCount: Math.max(0, v.teamCount - 1) }
          return v
        }),
      )
      setError("Something went wrong. Please try again.")
    }
  }

  const setMentorVenue = async (mentorUserId: string, venue: string | null) => {
    setError("")
    const prev = mentors.find((m) => m.mentorUserId === mentorUserId)?.venue ?? null
    setMentors((list) => list.map((m) => (m.mentorUserId === mentorUserId ? { ...m, venue } : m)))

    try {
      const res = await fetch("/api/admin/set-venue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mentorUserId, venue }),
      })
      if (!res.ok) {
        setMentors((list) => list.map((m) => (m.mentorUserId === mentorUserId ? { ...m, venue: prev } : m)))
        setError("Unable to set the mentor's venue.")
      }
    } catch {
      setMentors((list) => list.map((m) => (m.mentorUserId === mentorUserId ? { ...m, venue: prev } : m)))
      setError("Something went wrong. Please try again.")
    }
  }

  const addVenue = async (code: string, capacity: number) => {
    setError("")
    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", code, teamCapacity: capacity }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Unable to add venue.")
        return
      }
      setVenues((list) => [...list, { code: code.toUpperCase(), teamCapacity: capacity, teamCount: 0 }])
    } catch {
      setError("Something went wrong. Please try again.")
    }
  }

  const removeVenue = async (code: string) => {
    setError("")
    const prevVenues = venues
    setVenues((list) => list.filter((v) => v.code !== code))
    setMentors((list) => list.map((m) => (m.venue === code ? { ...m, venue: null } : m)))
    setStudents((list) => list.map((s) => (s.venue === code ? { ...s, venue: null } : s)))

    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", code }),
      })
      if (!res.ok) {
        setVenues(prevVenues)
        setError("Unable to remove venue.")
      }
    } catch {
      setVenues(prevVenues)
      setError("Something went wrong. Please try again.")
    }
  }

  const setVenueCapacity = async (code: string, capacity: number) => {
    setError("")
    const prev = venues.find((v) => v.code === code)?.teamCapacity ?? 0
    setVenues((list) => list.map((v) => (v.code === code ? { ...v, teamCapacity: capacity } : v)))

    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setCapacity", code, teamCapacity: capacity }),
      })
      if (!res.ok) {
        setVenues((list) => list.map((v) => (v.code === code ? { ...v, teamCapacity: prev } : v)))
        setError("Unable to update capacity.")
      }
    } catch {
      setVenues((list) => list.map((v) => (v.code === code ? { ...v, teamCapacity: prev } : v)))
      setError("Something went wrong. Please try again.")
    }
  }

  const handleDropOnMentor = (mentorUserId: string) => {
    setDragOverMentorId(null)
    const studentUserId = draggedStudentId.current
    draggedStudentId.current = null
    if (!studentUserId) return

    const current = assignedByMentor.get(mentorUserId) ?? []
    const alreadyThere = current.some((s) => s.studentUserId === studentUserId)
    if (!alreadyThere && current.length >= 2) {
      setError("This mentor already has 2 teams assigned.")
      return
    }
    assign(studentUserId, mentorUserId)
  }

  const exportRows = useMemo<ExportRow[]>(() => {
    const rows: ExportRow[] = []
    for (const m of mentors) {
      const assigned = assignedByMentor.get(m.mentorUserId) ?? []
      if (assigned.length === 0) continue
      for (const team of assigned) {
        rows.push({
          mentorId: m.mentorUserId,
          mentorName: m.name?.trim() || m.loginId,
          venue: m.venue ?? "Not Assigned",
          team,
        })
      }
    }
    rows.sort((a, b) => a.venue.localeCompare(b.venue) || a.mentorName.localeCompare(b.mentorName))
    return rows
  }, [mentors, assignedByMentor])

  const handleDownloadPdf = async () => {
    setError("")
    setDownloadingPdf(true)
    try {
      await downloadMentorMatchingPdf(exportRows)
    } catch {
      setError("Unable to generate the PDF. Please try again.")
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="border border-destructive/40 bg-destructive/5 text-destructive text-sm px-4 py-2">
          {error}
        </div>
      )}

        <VenueManager venues={venues} onAdd={addVenue} onRemove={removeVenue} onSetCapacity={setVenueCapacity} />

        <div className="border border-border bg-card/40 p-4 flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
          <div className="flex-1 flex flex-col gap-1.5 max-w-sm min-w-[200px]">
            <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Theme</Label>
            <Select value={themeFilter || "all"} onValueChange={(v) => setThemeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="bg-card border-border text-foreground w-full">
                <SelectValue placeholder="All themes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Themes</SelectItem>
                {availableThemes.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 flex flex-col gap-1.5 max-w-[200px] min-w-[160px]">
            <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Venue</Label>
            <Select value={venueFilter || "all"} onValueChange={(v) => setVenueFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="bg-card border-border text-foreground w-full">
                <SelectValue placeholder="All venues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Venues</SelectItem>
                {venues.map((v) => (
                  <SelectItem key={v.code} value={v.code}>
                    {v.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-muted-foreground text-xs sm:pb-2 flex-1 min-w-[200px]">
            A team automatically inherits the venue of the mentor it&apos;s dropped on.
          </p>

          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:bg-transparent dark:border-primary uppercase tracking-wider text-xs h-9 bg-transparent shrink-0"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {downloadingPdf ? "Preparing PDF..." : "Download PDF"}
          </Button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,320px)_1fr] gap-6 items-start">
          <div className="border border-border bg-card/40 p-4 flex flex-col gap-3 lg:sticky lg:top-4">
            <p className="text-primary text-xs uppercase tracking-wider">
              Unassigned Teams <span className="text-muted-foreground">({unassigned.length})</span>
            </p>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team or domain..."
              className="bg-card border-border text-foreground h-9 text-sm"
            />
            <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
              {unassigned.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-6">
                  {query ? "No teams match." : "All teams with a domain are assigned."}
                </p>
              ) : (
                unassigned.map((student) => (
                  <TeamCard
                    key={student.studentUserId}
                    student={student}
                    compatible={null}
                    domains={domains}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", student.studentUserId)
                      draggedStudentId.current = student.studentUserId
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Input
              value={mentorQuery}
              onChange={(e) => setMentorQuery(e.target.value)}
              placeholder="Search mentor name or login ID..."
              className="bg-card border-border text-foreground h-9 text-sm"
            />

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleMentors.length === 0 ? (
                <p className="text-muted-foreground text-sm col-span-full text-center py-8">
                  No mentors match these filters.
                </p>
              ) : (
                visibleMentors.map((mentor) => (
                  <MentorCard
                    key={mentor.mentorUserId}
                    mentor={mentor}
                    assignedStudents={assignedByMentor.get(mentor.mentorUserId) ?? []}
                    venues={venues}
                    domains={domains}
                    dragOver={dragOverMentorId === mentor.mentorUserId}
                    onDragOver={() => setDragOverMentorId(mentor.mentorUserId)}
                    onDragLeave={() => setDragOverMentorId((id) => (id === mentor.mentorUserId ? null : id))}
                    onDrop={() => handleDropOnMentor(mentor.mentorUserId)}
                    onRemove={(studentUserId) => assign(studentUserId, null)}
                    onVenueChange={(venue) => setMentorVenue(mentor.mentorUserId, venue)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
}
