import { DashboardNavCard } from "@/components/dashboard-nav-card"
import { getSession } from "@/lib/get-session"
import { CalendarClock, UserCircle, LayoutGrid, Users } from "lucide-react"
import { PortalHeader } from "@/components/portal-header"

export default async function MentorPage() {
  const session = await getSession()
  const displayName = session?.name?.trim() || session?.loginId

  return (
    <main className="min-h-screen bg-background px-6 pt-12 pb-24">
      <PortalHeader maxWidth="max-w-4xl" />

      <div className="relative z-10 max-w-3xl mx-auto mb-12">
        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">EnVision 2026</p>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground">
          Welcome, <span className="text-gold-gradient">{displayName}</span>
        </h1>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto grid sm:grid-cols-2 gap-8">
        <DashboardNavCard
          href="/mentor/timeline"
          icon={<CalendarClock className="w-9 h-9" />}
          title="Timeline"
          description="The full session plan for the program, phase by phase."
        />
        <DashboardNavCard
          href="/mentor/profile"
          icon={<UserCircle className="w-9 h-9" />}
          title="Profile"
          description="Add a photo and a description your team will see."
        />
        <DashboardNavCard
          href="/mentor/domains"
          icon={<LayoutGrid className="w-9 h-9" />}
          title="Domains"
          description="Browse and choose the domains you'd like to mentor in."
        />
        <DashboardNavCard
          href="/mentor/teams"
          icon={<Users className="w-9 h-9" />}
          title="My Teams"
          description="See the teams assigned to you as mentor."
        />
      </div>
    </main>
  )
}
