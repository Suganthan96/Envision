"use client"

import { useMemo, useState } from "react"
import { Search, UserCircle } from "lucide-react"
import { PublicMentorCard } from "@/components/public-mentor-card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { PublicShowcaseMentor } from "@/lib/public-showcase"

interface MentorsSearchProps {
  mentors: PublicShowcaseMentor[]
  domainTitleById: Record<string, string>
}

export function MentorsSearch({ mentors, domainTitleById }: MentorsSearchProps) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<PublicShowcaseMentor | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mentors

    return mentors.filter((mentor) => {
      const haystack = [
        mentor.name,
        mentor.loginId,
        mentor.bio,
        ...mentor.domainIds.map((id) => domainTitleById[id]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [mentors, query, domainTitleById])

  const selectedDisplayName = selected?.name?.trim() || selected?.loginId || ""
  const selectedDomainTitles = selected?.domainIds.map((id) => domainTitleById[id] ?? id) ?? []

  return (
    <>
      <div className="relative max-w-md mx-auto mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search mentors or domains…"
          className="w-full rounded-full bg-card/60 border border-border focus:border-primary/70 outline-none pl-11 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">No mentors match &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filtered.map((mentor) => (
            <PublicMentorCard
              key={mentor.mentorUserId}
              mentor={mentor}
              domainTitles={mentor.domainIds.map((id) => domainTitleById[id] ?? id)}
              onOpen={() => setSelected(mentor)}
            />
          ))}
        </div>
      )}

      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <div className="relative size-24 rounded-full border-2 border-primary/30 bg-card flex items-center justify-center overflow-hidden shrink-0">
                {selected.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.avatarUrl} alt={selectedDisplayName} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-11 h-11 text-muted-foreground" />
                )}
              </div>

              <DialogTitle className="font-serif text-xl text-foreground">{selectedDisplayName}</DialogTitle>

              {selectedDomainTitles.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {selectedDomainTitles.map((title) => (
                    <span
                      key={title}
                      className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5 rounded-full"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              )}

              {selected.bio ? (
                <p className="text-muted-foreground text-sm leading-relaxed pt-3 border-t border-border w-full whitespace-pre-wrap">
                  {selected.bio}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm pt-3 border-t border-border w-full">
                  This mentor hasn&apos;t added a bio yet.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
