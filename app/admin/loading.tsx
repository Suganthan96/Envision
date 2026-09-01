import { TableSkeleton } from "@/components/skeletons"

/**
 * Shown instantly on navigation into any /admin route while the server
 * streams the real page. Just the heading shape + a generic content
 * skeleton — enough to make the transition feel immediate.
 */
export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="h-[60px] w-full max-w-md mx-auto rounded-full bg-muted/40 animate-pulse mb-16" />
        <div className="h-8 w-64 rounded bg-muted/50 animate-pulse mb-8" />
        <div className="h-12 w-96 max-w-full rounded bg-muted/50 animate-pulse mb-8" />
        <TableSkeleton />
      </div>
    </main>
  )
}
