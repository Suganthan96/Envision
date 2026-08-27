import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdminNav } from "@/components/admin-nav"
import { AdminMentorProfilesView } from "@/components/admin-mentor-profiles-view"
import { getSession } from "@/lib/get-session"
import { getMentorProfilesForAdmin, type AdminMentorProfile } from "@/lib/admin-directories"
import { getDomains } from "@/lib/domains"

export const dynamic = "force-dynamic"

export default async function AdminMentorProfilesPage() {
  const session = await getSession()
  const [mentors, domains]: [AdminMentorProfile[], Awaited<ReturnType<typeof getDomains>>] = await Promise.all([
    session ? getMentorProfilesForAdmin(session.userId) : Promise.resolve([]),
    getDomains(),
  ])

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <div className="w-8 h-px bg-primary" />
            <span className="font-serif text-xl text-foreground">Envision</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="inline" />
            <LogoutButton />
          </div>
        </div>

        <AdminNav active="/admin/mentor-profiles" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Mentor <span className="text-gold-gradient">Profiles</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Every mentor&apos;s photo, description, venue, and domains, in one searchable directory.
        </p>

        <AdminMentorProfilesView mentors={mentors} domains={domains} />
      </div>
    </main>
  )
}
