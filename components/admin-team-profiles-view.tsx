"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MentorTeamSummaryCard } from "@/components/mentor-team-summary-card"
import type { AdminTeamProfile } from "@/lib/admin-directories"
import type { Domain } from "@/lib/domains"

export function AdminTeamProfilesView({ teams, domains }: { teams: AdminTeamProfile[]; domains: Domain[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "")
  const [themeFilter, setThemeFilter] = useState(() => searchParams.get("theme") ?? "")

  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (themeFilter) params.set("theme", themeFilter)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, themeFilter])

  const availableThemes = useMemo(() => {
    const ids = new Set<string>()
    for (const t of teams) if (t.domainId) ids.add(t.domainId)
    return domains.filter((d) => ids.has(d.id))
  }, [teams, domains])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return teams.filter((t) => {
      if (themeFilter && t.domainId !== themeFilter) return false
      if (!q) return true
      const name = (t.teamName ?? "").toLowerCase()
      const lead = (t.teamLeadName ?? "").toLowerCase()
      const mentor = (t.mentorName ?? "").toLowerCase()
      return name.includes(q) || lead.includes(q) || mentor.includes(q) || t.loginId.toLowerCase().includes(q)
    })
  }, [teams, query, themeFilter])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-1.5 w-full sm:max-w-sm">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Search</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search team name, lead, mentor, or login ID..."
            className="bg-card border-border text-foreground h-10"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full sm:max-w-[220px]">
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
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">
          {query || themeFilter ? "No teams match your filters." : "No teams yet."}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((team) => (
            <MentorTeamSummaryCard
              key={team.studentUserId}
              team={team}
              domainTitle={team.domainId ? domains.find((d) => d.id === team.domainId)?.title ?? team.domainId : null}
              href={`/admin/team-profiles/${team.studentUserId}`}
              mentorName={team.mentorName}
            />
          ))}
        </div>
      )}
    </div>
  )
}
