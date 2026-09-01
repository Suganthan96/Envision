import { Suspense } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { TableSkeleton } from "@/components/skeletons"
import { SubmissionsSection } from "./submissions-section"

export const dynamic = "force-dynamic"

export default function AdminSubmissionsPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-7xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/submissions" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Team <span className="text-gold-gradient">Submissions</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-10">
          Every team&apos;s final deck — Canva link and/or the file uploaded to Google Drive.
        </p>

        <Suspense fallback={<TableSkeleton />}>
          <SubmissionsSection />
        </Suspense>
      </div>
    </main>
  )
}
