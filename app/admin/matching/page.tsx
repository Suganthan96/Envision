import { Suspense } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { BoardSkeleton } from "@/components/skeletons"
import { MatchingSection } from "./matching-section"

export const dynamic = "force-dynamic"

export default function AdminMatchingPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-7xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/matching" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Mentor <span className="text-gold-gradient">Matching</span>
        </h1>

        <Suspense fallback={<BoardSkeleton />}>
          <MatchingSection />
        </Suspense>
      </div>
    </main>
  )
}
