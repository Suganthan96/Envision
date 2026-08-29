"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { PublicTeamCard } from "@/components/public-team-card"
import type { PublicShowcaseTeam } from "@/lib/public-showcase"

interface ShowcaseSearchProps {
  teams: PublicShowcaseTeam[]
  domainTitleById: Record<string, string>
}

export function ShowcaseSearch({ teams, domainTitleById }: ShowcaseSearchProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return teams

    return teams.filter((team) => {
      const haystack = [
        team.teamName,
        team.loginId,
        team.projectTitle,
        team.teamLeadName,
        team.mentorName,
        team.domainId ? domainTitleById[team.domainId] : null,
        ...team.memberNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [teams, query, domainTitleById])

  return (
    <>
      <div className="relative max-w-md mx-auto mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search teams, projects, members, mentors…"
          className="w-full rounded-full bg-card/60 border border-border focus:border-primary/70 outline-none pl-11 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">No teams match &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filtered.map((team) => (
            <PublicTeamCard
              key={team.studentUserId}
              team={team}
              domainTitle={team.domainId ? (domainTitleById[team.domainId] ?? null) : null}
            />
          ))}
        </div>
      )}
    </>
  )
}
