export default function ShowcaseTeamLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="h-[60px] w-full max-w-md mx-auto rounded-full bg-muted/40 animate-pulse mt-4" />
      <div className="relative z-10 px-6 py-16 max-w-3xl mx-auto">
        <div className="h-4 w-40 rounded bg-muted/50 animate-pulse mb-8" />
        <div className="flex flex-col sm:flex-row items-start gap-8 mb-12">
          <div className="size-28 rounded-2xl bg-muted/50 animate-pulse shrink-0" />
          <div className="flex-1 flex flex-col gap-3">
            <div className="h-10 w-2/3 rounded bg-muted/50 animate-pulse" />
            <div className="h-4 w-1/3 rounded bg-muted/40 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-muted/40 animate-pulse" />
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/50 p-6 sm:p-10 flex flex-col gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-3 w-24 rounded bg-muted/50 animate-pulse" />
              <div className="h-4 w-full rounded bg-muted/40 animate-pulse" />
              <div className="h-4 w-11/12 rounded bg-muted/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
