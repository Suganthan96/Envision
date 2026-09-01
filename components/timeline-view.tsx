import { cn } from "@/lib/utils"
import type { TimelineEntry, TimelinePhase } from "@/lib/timeline"

// Uses the LAST date in the string so a multi-day entry (e.g.
// "31.08.2026 & 01.09.2026") only counts as done once its final day has
// passed, not on the morning of its second day.
function parseDdMmYyyy(date: string | undefined) {
  const matches = date?.match(/\d{2}\.\d{2}\.\d{4}/g)
  if (!matches || matches.length === 0) return null
  const [day, month, year] = matches[matches.length - 1].split(".")
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function entryStatus(entry: TimelineEntry, today: Date): "done" | "upcoming" {
  const entryDate = parseDdMmYyyy(entry.date)
  if (!entryDate) return "upcoming"
  return entryDate < today ? "done" : "upcoming"
}

function hasFeedbackSlot(entry: TimelineEntry) {
  return entry.hasFeedbackForm === true
}

function FeedbackLink({ url, align }: { url?: string; align: "left" | "right" }) {
  return (
    <div className={cn("mt-3", align === "right" ? "flex justify-end" : "flex justify-start")}>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary border border-primary/40 px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Feedback Form ↗
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground border border-border px-3 py-1.5 opacity-60">
          Feedback Form Coming Soon
        </span>
      )}
    </div>
  )
}

function EntryContent({
  entry,
  done,
  align,
  feedbackUrl,
}: {
  entry: TimelineEntry
  done: boolean
  align: "left" | "right"
  feedbackUrl?: string
}) {
  const isRight = align === "right"
  return (
    <div>
      <div
        className={cn(
          "flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2",
          isRight ? "justify-end" : "justify-start",
        )}
      >
        <span
          className={cn("text-xs uppercase tracking-[0.15em]", done ? "text-primary" : "text-muted-foreground")}
        >
          {entry.label}
        </span>
        {entry.date && <span className="text-xs text-muted-foreground">{entry.date}</span>}
        {done && (
          <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5">
            Completed
          </span>
        )}
      </div>

      <h3 className="font-serif text-lg md:text-xl text-foreground mb-1 text-balance">{entry.title}</h3>
      <p className="text-muted-foreground text-sm">{entry.resource}</p>
      {entry.venue && <p className="text-muted-foreground text-sm mt-0.5">{entry.venue}</p>}

      {hasFeedbackSlot(entry) && <FeedbackLink url={feedbackUrl} align={align} />}
    </div>
  )
}

function Dot({ done }: { done: boolean }) {
  return (
    <div
      className={cn(
        "w-[11px] h-[11px] rotate-45 border",
        done ? "bg-primary border-primary" : "bg-background border-border",
      )}
    />
  )
}

export function TimelineView({
  phases,
  feedbackLinks = {},
}: {
  phases: TimelinePhase[]
  feedbackLinks?: Record<string, string>
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="space-y-20">
      {phases.map((phase) => (
        <div key={phase.id}>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-3 h-3 rotate-45 border border-primary shrink-0" />
            <h2 className="font-serif text-2xl md:text-3xl text-foreground">{phase.title}</h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="relative">
            {/* Mobile spine (left-aligned) */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border md:hidden" />
            {/* Desktop spine (centered) */}
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-px bg-border" />

            <div className="space-y-10 md:space-y-14">
              {phase.entries.map((entry, i) => {
                const status = entryStatus(entry, today)
                const done = status === "done"
                const isLeft = i % 2 === 0
                const feedbackUrl = feedbackLinks[entry.id]

                return (
                  <div key={entry.id} className="relative">
                    {/* Mobile layout: single left-aligned column */}
                    <div className="relative pl-8 md:hidden">
                      <div className="absolute -left-8 top-1.5">
                        <Dot done={done} />
                      </div>
                      <EntryContent entry={entry} done={done} align="left" feedbackUrl={feedbackUrl} />
                    </div>

                    {/* Desktop layout: alternating left/right around the center spine */}
                    <div className="hidden md:grid md:grid-cols-[1fr_2rem_1fr] md:items-start">
                      <div className={cn(!isLeft && "invisible")}>
                        {isLeft && (
                          <EntryContent entry={entry} done={done} align="right" feedbackUrl={feedbackUrl} />
                        )}
                      </div>
                      <div className="flex justify-center pt-1.5">
                        <Dot done={done} />
                      </div>
                      <div className={cn(isLeft && "invisible")}>
                        {!isLeft && (
                          <EntryContent entry={entry} done={done} align="left" feedbackUrl={feedbackUrl} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
