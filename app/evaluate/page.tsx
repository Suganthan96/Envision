import { Suspense } from "react"
import { PortalHeader } from "@/components/portal-header"
import { TableSkeleton } from "@/components/skeletons"
import { EvaluateSection } from "./evaluate-section"

export const dynamic = "force-dynamic"

export default function EvaluatePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-7xl mx-auto">
        <PortalHeader marginBottom="mb-16" />

        <Suspense fallback={<TableSkeleton />}>
          <EvaluateSection />
        </Suspense>
      </div>
    </main>
  )
}
