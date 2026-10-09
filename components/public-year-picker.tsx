import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Edition } from "@/lib/edition"

/**
 * Lets anyone browse an earlier programme year on the public pages,
 * read-only. Hidden until there is more than one year.
 */
export function PublicYearPicker({
  years,
  active,
  basePath,
}: {
  years: Edition[]
  active: string
  basePath: string
}) {
  if (years.length < 2) return null
  return (
    <nav aria-label="Programme year" className="flex flex-wrap justify-center gap-2 mt-8">
      {years.map((y) => {
        const on = y.id === active
        return (
          <Link
            key={y.id}
            href={y.isCurrent ? basePath : `${basePath}?year=${y.id}`}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex items-center h-8 px-4 rounded-full border text-sm transition-colors",
              on
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
            )}
          >
            {y.label}
          </Link>
        )
      })}
    </nav>
  )
}
