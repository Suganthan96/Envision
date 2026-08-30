import { GraduationCap, Users } from "lucide-react"
import { AdminNav } from "@/components/admin-nav"
import { DashboardNavCard } from "@/components/dashboard-nav-card"
import { getAppSettings } from "@/lib/app-settings"
import { AdminHeader } from "@/components/admin-header"

export const dynamic = "force-dynamic"

function stateLabel(visible: boolean, canSelect: boolean) {
  if (!visible) return "Hidden — they see the timeline instead"
  if (!canSelect) return "Visible, selection closed"
  return "Open for selection"
}

export default async function AdminDomainSelectionPage() {
  const {
    studentDomainSelectionOpen,
    studentCanSelect,
    mentorDomainSelectionOpen,
    mentorCanSelect,
  } = await getAppSettings()

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/domain-selection" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Domain <span className="text-gold-gradient">Selection</span>
        </h1>

        <div className="grid sm:grid-cols-2 gap-8 max-w-3xl">
          <DashboardNavCard
            href="/admin/students"
            icon={<GraduationCap className="w-9 h-9" />}
            title="Students"
            description={stateLabel(studentDomainSelectionOpen, studentCanSelect)}
          />
          <DashboardNavCard
            href="/admin/mentors"
            icon={<Users className="w-9 h-9" />}
            title="Mentors"
            description={stateLabel(mentorDomainSelectionOpen, mentorCanSelect)}
          />
        </div>
      </div>
    </main>
  )
}
