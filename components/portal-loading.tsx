/**
 * Shared route-level placeholder for the student and mentor portals. Every
 * page under /member and /mentor is `force-dynamic`, so navigation used to
 * sit on the previous screen until the server responded; this paints the
 * page's shape immediately instead. Pure CSS, no client JS.
 */
export function PortalLoading() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="h-[60px] w-full max-w-md mx-auto rounded-full bg-muted/40 animate-pulse" />

      <div className="relative z-10 max-w-4xl mx-auto mt-12">
        <div className="h-4 w-28 rounded bg-muted/50 animate-pulse mb-4" />
        <div className="h-11 w-80 max-w-full rounded bg-muted/50 animate-pulse mb-4" />
        <div className="h-5 w-full max-w-xl rounded bg-muted/40 animate-pulse mb-10" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-6 h-40 bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  )
}
