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
import { AdminMentorProfileSummaryCard } from "@/components/admin-mentor-profile-summary-card"
import type { AdminMentorProfile } from "@/lib/admin-directories"
import type { Domain } from "@/lib/domains"

export function AdminMentorProfilesView({
  mentors,
  domains,
}: {
  mentors: AdminMentorProfile[]
  domains: Domain[]
}) {
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
    for (const m of mentors) for (const id of m.domainIds) ids.add(id)
    return domains.filter((d) => ids.has(d.id))
  }, [mentors, domains])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return mentors.filter((m) => {
      if (themeFilter && !m.domainIds.includes(themeFilter)) return false
      if (!q) return true
      const name = (m.name ?? "").toLowerCase()
      return name.includes(q) || m.loginId.toLowerCase().includes(q)
    })
  }, [mentors, query, themeFilter])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-1.5 w-full sm:max-w-sm">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Search</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mentor name or login ID..."
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
          {query || themeFilter ? "No mentors match your filters." : "No mentors yet."}
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
