"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { SegmentedHealthBar } from "@/components/segmented-health-bar"
import { DomainIcon } from "@/components/domain-icon"
import { DOMAINS } from "@/lib/domains"
import { cn } from "@/lib/utils"

export interface RoleRow {
  loginId: string
  name: string | null
  phone: string | null
  teamLeadName: string | null
  domainIds: string[]
}

function domainTitle(domainId: string) {
  return DOMAINS.find((d) => d.id === domainId)?.title ?? domainId
}

function PersonCard({ person }: { person: RoleRow }) {
  const displayName = person.name?.trim() || person.loginId

  return (
    <div className="group relative p-6 bg-card border border-border hover:border-primary transition-colors duration-500">
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary" />

      <h3 className="font-serif text-lg text-foreground mb-1 text-balance">{displayName}</h3>
      {person.name?.trim() && (
        <p className="text-muted-foreground text-xs font-mono">{person.loginId}</p>
      )}
      {person.teamLeadName?.trim() && (
        <p className="text-muted-foreground text-xs mt-1">Led by {person.teamLeadName}</p>
      )}
      {person.phone?.trim() && (
        <p className="text-muted-foreground text-xs font-mono mb-4">{person.phone}</p>
      )}
      {!person.phone?.trim() && <div className="mb-4" />}

      <div className="flex flex-col gap-1.5">
        {person.domainIds.map((domainId) => (
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

function PersonCardsView({ people, personLabelPlural }: { people: RoleRow[]; personLabelPlural: string }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) => {
      const name = (p.name ?? "").toLowerCase()
      return name.includes(q) || p.loginId.toLowerCase().includes(q)
    })
  }, [people, query])

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
          <p className="text-muted-foreground">No {personLabelPlural} match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((person) => (
            <PersonCard key={person.loginId} person={person} />
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
  capacity,
  names,
}: {
  title: string
  icon: (typeof DOMAINS)[number]["icon"]
  count: number
  capacity: number
  names: string[]
}) {
  const full = count >= capacity

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

      <SegmentedHealthBar filled={Math.min(count, capacity)} total={capacity} />

      <p
        className={cn(
          "text-[10px] tracking-wider uppercase mt-3",
          full ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {full ? "Full" : `${capacity - count} slot${capacity - count === 1 ? "" : "s"} remaining`}
      </p>

      {names.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-1.5">
          {names.map((name) => (
            <span key={name} className="text-xs text-muted-foreground border border-border px-2 py-0.5">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ThemeWiseView({ people, capacityPerDomain }: { people: RoleRow[]; capacityPerDomain: number }) {
  const byDomain = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const person of people) {
      const displayName = person.name?.trim() || person.loginId
      for (const domainId of person.domainIds) {
        const existing = map.get(domainId) ?? []
        existing.push(displayName)
        map.set(domainId, existing)
      }
    }
    return map
  }, [people])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {DOMAINS.map((domain) => {
        const names = byDomain.get(domain.id) ?? []
        return (
          <ThemeCard
            key={domain.id}
            title={domain.title}
            icon={domain.icon}
            count={names.length}
            capacity={capacityPerDomain}
            names={names}
          />
        )
      })}
    </div>
  )
}

export function RoleSelectionsView({
  people,
  capacityPerDomain,
  personLabel,
  personLabelPlural,
  emptyLabel,
}: {
  people: RoleRow[]
  capacityPerDomain: number
  personLabel: string
  personLabelPlural: string
  emptyLabel: string
}) {
  const [view, setView] = useState<"person" | "theme">("person")

  return (
    <div>
      <div className="flex items-center gap-1 mb-8 border border-border w-fit">
        <button
          type="button"
          onClick={() => setView("person")}
          className={cn(
            "px-4 py-2 text-xs uppercase tracking-wider transition-colors",
            view === "person" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
          )}
        >
          By {personLabel}
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

      {people.length === 0 ? (
        <div className="border border-border p-8 text-center">
          <p className="text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : view === "person" ? (
        <PersonCardsView people={people} personLabelPlural={personLabelPlural} />
      ) : (
        <ThemeWiseView people={people} capacityPerDomain={capacityPerDomain} />
      )}
    </div>
  )
}
