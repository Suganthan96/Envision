import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { DashboardNavCard } from "@/components/dashboard-nav-card"
import { getSession } from "@/lib/get-session"
import { CalendarClock, Users, LayoutGrid, UserCircle } from "lucide-react"

export default async function MemberPage() {
  const session = await getSession()
  const teamName = session?.name?.trim() || session?.loginId

  return (
    <main className="min-h-screen bg-background px-6 pt-12 pb-24">
      <div className="relative z-10 max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-8 h-px bg-primary" />
          <span className="font-serif text-xl text-foreground">Envision</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle variant="inline" />
          <LogoutButton />
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto mb-12">
        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">EnVision 2026</p>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground">
          Welcome, <span className="text-gold-gradient">{teamName}</span>
        </h1>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto grid sm:grid-cols-2 gap-8">
        <DashboardNavCard
          href="/member/timeline"
          icon={<CalendarClock className="w-9 h-9" />}
          title="Timeline"
          description="The full session plan for the program, phase by phase."
        />
        <DashboardNavCard
          href="/member/team"
          icon={<Users className="w-9 h-9" />}
          title="Team Profile"
          description="Edit your team name and manage your roster."
        />
        <DashboardNavCard
          href="/member/domains"
          icon={<LayoutGrid className="w-9 h-9" />}
          title="Domains"
          description="Browse and choose the domain for your project."
        />
        <DashboardNavCard
          href="/member/mentor"
          icon={<UserCircle className="w-9 h-9" />}
          title="My Mentor"
          description="Meet the mentor guiding your team this cycle."
        />
      </div>
    </main>
  )
}
