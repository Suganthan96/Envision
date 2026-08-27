"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { MentorTeamSummaryCard } from "@/components/mentor-team-summary-card"
import type { AdminTeamProfile } from "@/lib/admin-directories"
import type { Domain } from "@/lib/domains"

export function AdminTeamProfilesView({ teams, domains }: { teams: AdminTeamProfile[]; domains: Domain[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return teams
    return teams.filter((t) => {
      const name = (t.teamName ?? "").toLowerCase()
      const lead = (t.teamLeadName ?? "").toLowerCase()
      return name.includes(q) || lead.includes(q) || t.loginId.toLowerCase().includes(q)
    })
  }, [teams, query])

  return (
    <div className="flex flex-col gap-6">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search team name, lead, or login ID..."
        className="bg-card border-border text-foreground h-10 max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">
          {query ? "No teams match your search." : "No teams yet."}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((team) => (
            <MentorTeamSummaryCard
              key={team.studentUserId}
              team={team}
              domainTitle={team.domainId ? domains.find((d) => d.id === team.domainId)?.title ?? team.domainId : null}
              href={`/admin/team-profiles/${team.studentUserId}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
