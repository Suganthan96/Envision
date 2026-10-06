import { Suspense } from "react"
import Link from "next/link"
import { LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import { JUDGING_SECTIONS, type JudgingSlug } from "@/components/judging/judging-sections"
import { LiveRoundBar } from "@/components/judging/live-round-bar"

/**
 * The card under the admin nav on every Judging page: the section tabs (on
 * section pages) and the live round. It breaks out of the page's own width
 * and re-centres at the nav's width, exactly as AdminNav does, so the two line
 * up whatever container the page uses.
 */
export function JudgingBand({ active }: { active?: JudgingSlug }) {
  return (
    <div className="relative w-screen left-1/2 -translate-x-1/2 px-6 mb-10">
      <div className="max-w-5xl mx-auto rounded-2xl bg-card/40 backdrop-blur-md border border-border">
        {active && (
          <nav
            aria-label="Judging sections"
            className="flex flex-wrap items-center gap-1 px-3 py-2.5 border-b border-border"
          >
            <Link
              href="/admin/judging"
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-muted-foreground hover:text-primary text-xs uppercase tracking-[0.12em] whitespace-nowrap shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              All
            </Link>
            <span className="w-px h-5 bg-border mx-1 shrink-0" />
            {JUDGING_SECTIONS.map((s) => {
              const current = s.slug === active
              return (
                <Link
                  key={s.slug}
                  href={`/admin/judging/${s.slug}`}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center h-8 px-3 rounded-md text-xs uppercase tracking-[0.12em] whitespace-nowrap shrink-0 transition-colors",
                    current
                      ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/40"
                      : "text-muted-foreground hover:text-primary hover:bg-card",
                  )}
                >
                  {s.label}
                </Link>
              )
            })}
          </nav>
        )}
        <div className="px-5 py-4">
          <Suspense fallback={<div className="h-12 rounded-md bg-border/30 animate-pulse" />}>
            <LiveRoundBar />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
