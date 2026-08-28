import { Suspense } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminMentorProfilesView } from "@/components/admin-mentor-profiles-view"
import { getSession } from "@/lib/get-session"
import { getMentorProfilesForAdmin } from "@/lib/admin-directories"
import { getDomains } from "@/lib/domains"
import { AdminHeader } from "@/components/admin-header"

export const dynamic = "force-dynamic"

export default async function AdminMentorProfilesPage() {
  const session = await getSession()
  const [mentors, domains] = await Promise.all([
    session ? getMentorProfilesForAdmin(session.userId) : Promise.resolve([]),
    getDomains(),
  ])

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/mentor-profiles" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Mentor <span className="text-gold-gradient">Profiles</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Every mentor, in one searchable directory. Click a card for their full profile.
        </p>

        <Suspense fallback={null}>
          <AdminMentorProfilesView mentors={mentors} domains={domains} />
        </Suspense>
      </div>
    </main>
  )
}
