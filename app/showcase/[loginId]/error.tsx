"use client"

import { useEffect } from "react"

// A failed fetch (usually a transient network blip to Supabase) lands here
// instead of 404ing. Retry on our own shortly after, since AutoRefresh keeps
// re-rendering this page while it's open.
export default function ShowcaseTeamError({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    const t = setTimeout(reset, 3_000)
    return () => clearTimeout(t)
  }, [reset])

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground">Couldn&apos;t load this project right now. Retrying…</p>
      <button onClick={reset} className="text-primary text-sm underline underline-offset-4">
        Try again
      </button>
    </main>
  )
}
