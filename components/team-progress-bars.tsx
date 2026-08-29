import { cn } from "@/lib/utils"

export interface ProgressItem {
  label: string
  done: boolean
  /** Not yet implemented (e.g. PPT upload) — shown distinctly, not counted. */
  pending?: boolean
}

/**
 * A row of segments showing how much of a team's submission is filled in —
 * roster, problem statement, short solution, long solution, and (once built)
 * the PPT upload. The PPT segment is rendered as a dashed "coming soon"
 * placeholder rather than "missing", since nobody can complete it yet.
 */
export function TeamProgressBars({ items }: { items: ProgressItem[] }) {
  const trackable = items.filter((i) => !i.pending)
  const doneCount = trackable.filter((i) => i.done).length

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        {items.map((item, i) => (
          <div
            key={i}
            title={item.pending ? `${item.label} — coming soon` : `${item.label} — ${item.done ? "Done" : "Missing"}`}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              item.pending
                ? "border border-dashed border-muted-foreground/40 bg-transparent"
                : item.done
                  ? "bg-primary"
                  : "bg-border",
            )}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider text-center">
        {doneCount}/{trackable.length} complete
      </p>
    </div>
  )
}
