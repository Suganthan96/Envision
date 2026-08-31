"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/searchable-select"
import type { AdminSubmissionRow } from "@/lib/admin-directories"
import type { Domain } from "@/lib/domains"

export function AdminSubmissionsView({
  rows,
  domains,
}: {
  rows: AdminSubmissionRow[]
  domains: Domain[]
}) {
  const [query, setQuery] = useState("")
  const [themeFilter, setThemeFilter] = useState("")
  const [venueFilter, setVenueFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const domainTitle = useMemo(() => {
    const m = new Map(domains.map((d) => [d.id, d.title]))
    return (id: string | null) => (id ? m.get(id) ?? id : null)
  }, [domains])

  const themeOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const r of rows) if (r.domainId) ids.add(r.domainId)
    return [...ids]
      .map((id) => ({ value: id, label: domainTitle(id) ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [rows, domainTitle])

  const venueOptions = useMemo(() => {
    const codes = new Set<string>()
    for (const r of rows) if (r.venue?.trim()) codes.add(r.venue.trim())
    return [...codes].sort().map((c) => ({ value: c, label: c }))
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (themeFilter && r.domainId !== themeFilter) return false
      if (venueFilter && (r.venue ?? "").trim() !== venueFilter) return false
      const submitted = Boolean(r.link)
      if (statusFilter === "submitted" && !submitted) return false
      if (statusFilter === "missing" && submitted) return false
      if (!q) return true
      return (
        (r.teamName ?? "").toLowerCase().includes(q) ||
        r.loginId.toLowerCase().includes(q) ||
        (r.venue ?? "").toLowerCase().includes(q)
      )
    })
  }, [rows, query, themeFilter, venueFilter, statusFilter])

  const submittedCount = rows.filter((r) => r.link).length

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        <span className="text-foreground font-medium">{submittedCount}</span> of {rows.length} teams have
        submitted.
      </p>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
        <div className="flex flex-col gap-1.5 w-full sm:max-w-xs">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Search</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Team, login ID, file name, venue…"
            className="bg-card border-border text-foreground h-10"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full sm:max-w-[240px]">
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
        <div className="flex flex-col gap-1.5 w-full sm:max-w-[160px]">
          <Label className="text-primary tracking-[0.1em] uppercase text-[10px]">Venue</Label>
          <SearchableSelect
            value={venueFilter}
            onChange={setVenueFilter}
            options={venueOptions}
            allLabel="All Venues"
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
                <th className="text-left font-medium px-4 py-3">Venue</th>
                <th className="text-left font-medium px-4 py-3">Theme</th>
                <th className="text-left font-medium px-4 py-3">Submission Link</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const submitted = Boolean(r.link)
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
                    <td className="px-4 py-3 text-muted-foreground">{r.venue ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{domainTitle(r.domainId) ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.link ? (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline max-w-[280px]"
                          title={r.link}
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{r.link}</span>
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
                      {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
