import { Suspense } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { TableSkeleton } from "@/components/skeletons"
import { ScoresSection } from "./scores-section"

export const dynamic = "force-dynamic"

export default function AdminScoresPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-7xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/scores" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Judging <span className="text-gold-gradient">Scores</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-10">
          Enter each team&apos;s mark for every rubric criterion. The total is worked out as you go.
        </p>

        <Suspense fallback={<TableSkeleton />}>
          <ScoresSection />
        </Suspense>
      </div>
    </main>
  )
}
