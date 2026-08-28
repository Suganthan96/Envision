import { DashboardNavCard } from "@/components/dashboard-nav-card"
import { getSession } from "@/lib/get-session"
import { CalendarClock, Users, LayoutGrid, UserCircle, Lightbulb } from "lucide-react"
import { PortalHeader } from "@/components/portal-header"

export default async function MemberPage() {
  const session = await getSession()
  const teamName = session?.name?.trim() || session?.loginId

  return (
    <main className="min-h-screen bg-background px-6 pt-12 pb-24">
      <PortalHeader maxWidth="max-w-4xl" />

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
        <DashboardNavCard
          href="/member/project"
          icon={<Lightbulb className="w-9 h-9" />}
          title="Project"
          description="Add your problem statement and solution."
          className="sm:col-span-2 sm:mx-auto sm:w-[calc(50%-1rem)]"
        />
      </div>
    </main>
  )
}
