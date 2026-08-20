"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { SegmentedHealthBar } from "@/components/segmented-health-bar"
import { DomainIcon } from "@/components/domain-icon"
import { DOMAINS } from "@/lib/domains"
import { cn } from "@/lib/utils"

export interface MentorRow {
  loginId: string
  name: string | null
  domainIds: string[]
}

const MENTOR_CAPACITY_PER_DOMAIN = 6

function domainTitle(domainId: string) {
  return DOMAINS.find((d) => d.id === domainId)?.title ?? domainId
}

function MentorCard({ mentor }: { mentor: MentorRow }) {
  const displayName = mentor.name?.trim() || mentor.loginId

  return (
    <div className="group relative p-6 bg-card border border-border hover:border-primary transition-colors duration-500">
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary" />

      <h3 className="font-serif text-lg text-foreground mb-1 text-balance">{displayName}</h3>
      {mentor.name?.trim() && (
        <p className="text-muted-foreground text-xs font-mono mb-4">{mentor.loginId}</p>
      )}
      {!mentor.name?.trim() && <div className="mb-4" />}

      <div className="flex flex-col gap-1.5">
        {mentor.domainIds.map((domainId) => (
          <span
            key={domainId}
            className="text-muted-foreground text-sm border-l-2 border-primary/40 pl-2"
          >
            {domainTitle(domainId)}
          </span>
        ))}
      </div>
    </div>
  )
}

function MentorCardsView({ mentors }: { mentors: MentorRow[] }) {
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
    <div>
      <div className="relative mb-8 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or login ID..."
          className="pl-9 bg-card border-border text-foreground rounded-none h-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="border border-border p-8 text-center">
          <p className="text-muted-foreground">No mentors match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mentor) => (
            <MentorCard key={mentor.loginId} mentor={mentor} />
          ))}
        </div>
      )}
    </div>
  )
}

function ThemeCard({
  title,
  icon,
  count,
  mentorNames,
}: {
  title: string
  icon: (typeof DOMAINS)[number]["icon"]
  count: number
  mentorNames: string[]
}) {
  const full = count >= MENTOR_CAPACITY_PER_DOMAIN

  return (
    <div className="group relative p-6 bg-card border border-border">
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary" />

      <div className="flex items-start gap-4 mb-5">
        <div className="w-10 h-10 flex items-center justify-center text-primary shrink-0">
          <DomainIcon icon={icon} className="w-8 h-8" />
        </div>
        <h3 className="font-serif text-lg text-foreground text-balance">{title}</h3>
      </div>

      <SegmentedHealthBar filled={Math.min(count, MENTOR_CAPACITY_PER_DOMAIN)} total={MENTOR_CAPACITY_PER_DOMAIN} />

      <p
        className={cn(
          "text-[10px] tracking-wider uppercase mt-3",
          full ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {full ? "Full" : `${MENTOR_CAPACITY_PER_DOMAIN - count} slot${MENTOR_CAPACITY_PER_DOMAIN - count === 1 ? "" : "s"} remaining`}
      </p>

      {mentorNames.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-1.5">
          {mentorNames.map((name) => (
            <span key={name} className="text-xs text-muted-foreground border border-border px-2 py-0.5">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ThemeWiseView({ mentors }: { mentors: MentorRow[] }) {
  const byDomain = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const mentor of mentors) {
      const displayName = mentor.name?.trim() || mentor.loginId
      for (const domainId of mentor.domainIds) {
        const existing = map.get(domainId) ?? []
        existing.push(displayName)
        map.set(domainId, existing)
      }
    }
    return map
  }, [mentors])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {DOMAINS.map((domain) => {
        const names = byDomain.get(domain.id) ?? []
        return (
          <ThemeCard key={domain.id} title={domain.title} icon={domain.icon} count={names.length} mentorNames={names} />
        )
      })}
    </div>
  )
}

export function MentorSelectionsView({ mentors }: { mentors: MentorRow[] }) {
  const [view, setView] = useState<"mentor" | "theme">("mentor")

  return (
    <div>
      <div className="flex items-center gap-1 mb-8 border border-border w-fit">
        <button
          type="button"
          onClick={() => setView("mentor")}
          className={cn(
            "px-4 py-2 text-xs uppercase tracking-wider transition-colors",
            view === "mentor" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
          )}
        >
          By Mentor
        </button>
        <button
          type="button"
          onClick={() => setView("theme")}
          className={cn(
            "px-4 py-2 text-xs uppercase tracking-wider transition-colors",
            view === "theme" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
          )}
        >
          By Theme
        </button>
      </div>

      {mentors.length === 0 ? (
        <div className="border border-border p-8 text-center">
          <p className="text-muted-foreground">No mentors have selected a domain yet.</p>
        </div>
      ) : view === "mentor" ? (
        <MentorCardsView mentors={mentors} />
      ) : (
        <ThemeWiseView mentors={mentors} />
      )}
    </div>
  )
}
