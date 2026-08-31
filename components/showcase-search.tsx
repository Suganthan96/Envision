"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { PublicTeamCard } from "@/components/public-team-card"
import { SearchableSelect } from "@/components/searchable-select"
import type { PublicShowcaseTeam } from "@/lib/public-showcase"

interface ShowcaseSearchProps {
  teams: PublicShowcaseTeam[]
  domainTitleById: Record<string, string>
}

export function ShowcaseSearch({ teams, domainTitleById }: ShowcaseSearchProps) {
  const [query, setQuery] = useState("")
  const [themeFilter, setThemeFilter] = useState("")
  const [mentorFilter, setMentorFilter] = useState("")

  const themeOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const t of teams) if (t.domainId) ids.add(t.domainId)
    return [...ids]
      .map((id) => ({ value: id, label: domainTitleById[id] ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [teams, domainTitleById])

  const mentorOptions = useMemo(() => {
    const names = new Set<string>()
    for (const t of teams) if (t.mentorName?.trim()) names.add(t.mentorName.trim())
    return [...names].sort().map((n) => ({ value: n, label: n }))
  }, [teams])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return teams.filter((team) => {
      if (themeFilter && team.domainId !== themeFilter) return false
      if (mentorFilter && (team.mentorName ?? "").trim() !== mentorFilter) return false
      if (!q) return true

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
  }, [teams, query, themeFilter, mentorFilter, domainTitleById])

  const hasFilters = !!query || !!themeFilter || !!mentorFilter

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-3xl mx-auto mb-12">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams, projects, members, mentors…"
            className="w-full rounded-full bg-card/60 border border-border focus:border-primary/70 outline-none pl-11 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors"
          />
        </div>
        <SearchableSelect
          value={themeFilter}
          onChange={setThemeFilter}
          options={themeOptions}
          allLabel="All Themes"
          placeholder="Search themes…"
          className="sm:w-52 rounded-full"
        />
        <SearchableSelect
          value={mentorFilter}
          onChange={setMentorFilter}
          options={mentorOptions}
          allLabel="All Mentors"
          placeholder="Search mentors…"
          className="sm:w-48 rounded-full"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">
          {hasFilters ? "No teams match your filters." : "No teams yet."}
        </p>
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
