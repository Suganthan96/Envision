import { Suspense } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { CardGridSkeleton } from "@/components/skeletons"
import { TeamProfilesSection } from "./team-profiles-section"

export const dynamic = "force-dynamic"

export default function AdminTeamProfilesPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/team-profiles" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Team <span className="text-gold-gradient">Profiles</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Every team&apos;s logo, roster size, domain, and project, in one searchable directory.
        </p>

        <Suspense fallback={<CardGridSkeleton />}>
          <TeamProfilesSection />
        </Suspense>
      </div>
    </main>
  )
}
