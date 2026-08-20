import { cn } from "@/lib/utils"

export function SegmentedHealthBar({ filled, total }: { filled: number; total: number }) {
  const segments = Array.from({ length: total }, (_, i) => i < filled)

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1 flex-1">
        {segments.map((isFilled, i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 transition-colors duration-500",
              isFilled ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
      <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0">
        {filled}/{total}
      </span>
    </div>
  )
}
