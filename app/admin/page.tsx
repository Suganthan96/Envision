import { Suspense } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import {
  Hero,
  Leaderboard,
  LiveRound,
  NeedsYou,
  PanelSkeleton,
  People,
  RecentDecks,
  Switches,
  Themes,
} from "@/components/admin-dashboard/panels"

export const dynamic = "force-dynamic"

/**
 * The admin home: where the programme stands, what is waiting on the admin,
 * and the state of people, judging, themes and portal switches. Every panel
 * streams in on its own, so a slow query never holds up the rest.
 */
export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-6xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin" />

        <Suspense
          fallback={
            <div className="mb-12 flex flex-col gap-4" aria-hidden>
              <div className="h-5 w-48 rounded bg-border/40 animate-pulse" />
              <div className="h-14 w-full max-w-3xl rounded bg-border/40 animate-pulse" />
              <div className="h-6 w-full max-w-xl rounded bg-border/30 animate-pulse" />
            </div>
          }
        >
          <Hero />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-12">
          <Suspense fallback={<PanelSkeleton title="Needs you" rows={5} className="lg:col-span-7" />}>
            <NeedsYou />
          </Suspense>
          <div className="lg:col-span-5 flex flex-col gap-6 min-w-0">
            <Suspense fallback={<PanelSkeleton title="People" rows={3} />}>
              <People />
            </Suspense>
            <Suspense fallback={<PanelSkeleton title="Latest decks" rows={4} />}>
              <RecentDecks />
            </Suspense>
          </div>

          <Suspense fallback={<div className="lg:col-span-12 h-24 rounded-xl border border-border bg-card/40 animate-pulse" />}>
            <LiveRound />
          </Suspense>

          <Suspense fallback={<PanelSkeleton title="Leaderboard" rows={5} className="lg:col-span-5" />}>
            <Leaderboard />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="Themes" rows={8} className="lg:col-span-7" />}>
            <Themes />
          </Suspense>

          <Suspense fallback={<PanelSkeleton title="Portal switches" rows={3} className="lg:col-span-12" />}>
            <Switches />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
