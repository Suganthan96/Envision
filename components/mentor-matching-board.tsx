"use client"

import type React from "react"
import { useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DOMAINS } from "@/lib/domains"
import { cn } from "@/lib/utils"

export interface MatchingMentor {
  mentorUserId: string
  loginId: string
  name: string | null
  domainIds: string[]
}

export interface MatchingStudent {
  studentUserId: string
  loginId: string
  teamName: string | null
  domainId: string
  mentorUserId: string | null
}

function domainTitle(domainId: string) {
  return DOMAINS.find((d) => d.id === domainId)?.title ?? domainId
}

function TeamCard({
  student,
  compatible,
  onDragStart,
  onRemove,
}: {
  student: MatchingStudent
  compatible: boolean | null
  onDragStart: (e: React.DragEvent) => void
  onRemove?: () => void
}) {
  const displayName = student.teamName?.trim() || student.loginId

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
      <p className="text-foreground text-sm font-medium truncate">{displayName}</p>
      <p className="text-muted-foreground text-xs truncate">{domainTitle(student.domainId)}</p>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Unassign ${displayName}`}
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
  onDrop,
  onRemove,
  dragOver,
  onDragOver,
  onDragLeave,
}: {
  mentor: MatchingMentor
  assignedStudents: MatchingStudent[]
  onDrop: () => void
  onRemove: (studentUserId: string) => void
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
        <div className="flex flex-wrap gap-1 mt-1.5">
          {mentor.domainIds.map((id) => (
            <span
              key={id}
              className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5"
            >
              {domainTitle(id)}
            </span>
          ))}
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

export function MentorMatchingBoard({
  initialMentors,
  initialStudents,
}: {
  initialMentors: MatchingMentor[]
  initialStudents: MatchingStudent[]
}) {
  const [students, setStudents] = useState<MatchingStudent[]>(initialStudents)
  const [query, setQuery] = useState("")
  const [dragOverMentorId, setDragOverMentorId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [themeFilter, setThemeFilter] = useState("")

  const mentors = initialMentors

  const availableThemes = useMemo(() => {
    const ids = new Set<string>()
    for (const m of mentors) for (const id of m.domainIds) ids.add(id)
    for (const s of students) ids.add(s.domainId)
    return DOMAINS.filter((d) => ids.has(d.id))
  }, [mentors, students])

  const visibleMentors = useMemo(
    () => (themeFilter ? mentors.filter((m) => m.domainIds.includes(themeFilter)) : mentors),
    [mentors, themeFilter],
  )

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
      if (!q) return true
      const name = (s.teamName ?? "").toLowerCase()
      return name.includes(q) || s.loginId.toLowerCase().includes(q) || domainTitle(s.domainId).toLowerCase().includes(q)
    })
  }, [students, query, themeFilter])

  const draggedStudentId = useRef<string | null>(null)

  const assign = async (studentUserId: string, mentorUserId: string | null) => {
    setError("")
    const prevMentorId = students.find((s) => s.studentUserId === studentUserId)?.mentorUserId ?? null

    setStudents((prev) =>
      prev.map((s) => (s.studentUserId === studentUserId ? { ...s, mentorUserId } : s)),
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
          prev.map((s) => (s.studentUserId === studentUserId ? { ...s, mentorUserId: prevMentorId } : s)),
        )
        setError(data.error ?? "Unable to update assignment.")
      }
    } catch {
      setStudents((prev) =>
        prev.map((s) => (s.studentUserId === studentUserId ? { ...s, mentorUserId: prevMentorId } : s)),
      )
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

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="border border-destructive/40 bg-destructive/5 text-destructive text-sm px-4 py-2">
          {error}
        </div>
      )}

      <div className="border border-border bg-card/40 p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 flex flex-col gap-1.5 max-w-sm">
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
        <p className="text-muted-foreground text-xs sm:pb-2">
          Filters both the unassigned teams and the mentors below to a single theme.
        </p>
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
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", student.studentUserId)
                    draggedStudentId.current = student.studentUserId
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleMentors.length === 0 ? (
            <p className="text-muted-foreground text-sm col-span-full text-center py-8">
              No mentors have picked this theme.
            </p>
          ) : (
            visibleMentors.map((mentor) => (
              <MentorCard
                key={mentor.mentorUserId}
                mentor={mentor}
                assignedStudents={assignedByMentor.get(mentor.mentorUserId) ?? []}
                dragOver={dragOverMentorId === mentor.mentorUserId}
                onDragOver={() => setDragOverMentorId(mentor.mentorUserId)}
                onDragLeave={() => setDragOverMentorId((id) => (id === mentor.mentorUserId ? null : id))}
                onDrop={() => handleDropOnMentor(mentor.mentorUserId)}
                onRemove={(studentUserId) => assign(studentUserId, null)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
