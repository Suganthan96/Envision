/**
 * Lightweight placeholder blocks shown while a streamed (Suspense) section
 * of a page is still resolving on the server. They deliberately mirror the
 * rough shape of the real content so the layout doesn't jump when it swaps
 * in. Pure CSS, no client JS.
 */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`h-4 rounded bg-muted/60 animate-pulse ${className}`} />
}

/** Filter bar + a responsive grid of card placeholders (showcase, mentors,
 *  admin team/mentor profile directories). */
export function CardGridSkeleton({ cards = 9 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="h-10 w-full sm:max-w-sm rounded-lg bg-muted/60 animate-pulse" />
        <div className="h-10 w-full sm:max-w-[220px] rounded-lg bg-muted/60 animate-pulse" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-6 flex flex-col items-center gap-3">
            <div className="size-20 rounded-lg bg-muted/60 animate-pulse" />
            <SkeletonLine className="w-2/3" />
            <SkeletonLine className="w-1/3 h-3" />
            <div className="w-full flex flex-col gap-1.5 mt-2">
              <SkeletonLine className="h-2" />
              <SkeletonLine className="h-2" />
              <SkeletonLine className="h-2 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Search bar + stacked table rows (admin user management). */
export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="h-10 w-full max-w-sm rounded-lg bg-muted/60 animate-pulse" />
        <div className="h-10 w-28 rounded-lg bg-muted/60 animate-pulse shrink-0" />
      </div>
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="size-4 rounded bg-muted/60 animate-pulse shrink-0" />
            <SkeletonLine className="w-16 shrink-0" />
            <SkeletonLine className="flex-1 max-w-[200px]" />
            <SkeletonLine className="w-24 shrink-0 hidden sm:block" />
            <SkeletonLine className="w-40 shrink-0 hidden md:block" />
            <div className="h-8 w-16 rounded-lg bg-muted/60 animate-pulse shrink-0 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Two big panels + a column of cards (mentor matching board). */
export function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="border border-border rounded-lg p-4 h-40 bg-muted/20 animate-pulse" />
      <div className="border border-border rounded-lg p-4 h-24 bg-muted/20 animate-pulse" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-4 h-72 bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
