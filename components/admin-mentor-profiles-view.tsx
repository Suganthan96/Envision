"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { AdminMentorProfileSummaryCard } from "@/components/admin-mentor-profile-summary-card"
import type { AdminMentorProfile } from "@/lib/admin-directories"

export function AdminMentorProfilesView({ mentors }: { mentors: AdminMentorProfile[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mentors
    return mentors.filter((m) => {
      const name = (m.name ?? "").toLowerCase()
      return name.includes(q) || m.loginId.toLowerCase().includes(q)
    })
  }, [mentors, query])

  return (
    <div className="flex flex-col gap-6">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search mentor name or login ID..."
        className="bg-card border-border text-foreground h-10 max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">
          {query ? "No mentors match your search." : "No mentors yet."}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((mentor) => (
            <AdminMentorProfileSummaryCard key={mentor.mentorUserId} mentor={mentor} />
          ))}
        </div>
      )}
    </div>
  )
}
