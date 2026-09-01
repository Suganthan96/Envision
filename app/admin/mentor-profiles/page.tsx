import { Suspense } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { CardGridSkeleton } from "@/components/skeletons"
import { MentorProfilesSection } from "./mentor-profiles-section"

export const dynamic = "force-dynamic"

export default function AdminMentorProfilesPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/mentor-profiles" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Mentor <span className="text-gold-gradient">Profiles</span>
        </h1>

        <Suspense fallback={<CardGridSkeleton />}>
          <MentorProfilesSection />
        </Suspense>
      </div>
    </main>
  )
}
