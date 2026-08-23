import { cn } from "@/lib/utils"
import type { TimelineEntry, TimelinePhase } from "@/lib/timeline"

function parseDdMmYyyy(date: string | undefined) {
  const match = date?.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (!match) return null
  const [, day, month, year] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function entryStatus(entry: TimelineEntry, today: Date): "done" | "upcoming" {
  const entryDate = parseDdMmYyyy(entry.date)
  if (!entryDate) return "upcoming"
  return entryDate < today ? "done" : "upcoming"
}

export function TimelineView({ phases }: { phases: TimelinePhase[] }) {
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

          <div className="relative pl-8">
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-10">
              {phase.entries.map((entry) => {
                const status = entryStatus(entry, today)
                const done = status === "done"

                return (
                  <div key={entry.id} className="relative">
                    <div
                      className={cn(
                        "absolute -left-8 top-1.5 w-[11px] h-[11px] rotate-45 border",
                        done ? "bg-primary border-primary" : "bg-background border-border",
                      )}
                    />

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                      <span
                        className={cn(
                          "text-xs uppercase tracking-[0.15em]",
                          done ? "text-primary" : "text-muted-foreground",
                        )}
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
