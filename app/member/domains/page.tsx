import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { DomainSelectionPage } from "@/components/domain-selection-page"
import { getAppSettings } from "@/lib/app-settings"
import { getDomains } from "@/lib/domains"

export const dynamic = "force-dynamic"

export default async function MemberDomainsPage() {
  const { studentDomainSelectionOpen, studentCanSelect } = await getAppSettings()
  const domains = await getDomains()

  return (
    <main className="min-h-screen bg-background px-6 py-6">
      <div className="relative z-10 max-w-5xl mx-auto flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="w-8 h-px bg-primary" />
          <span className="font-serif text-xl text-foreground">Envision</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle variant="inline" />
          <LogoutButton />
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <Link
          href="/member"
          className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider inline-block"
        >
          ← Back to Portal
        </Link>
      </div>

      <DomainSelectionPage
        role="student"
        eyebrow="Student Portal"
        heading={studentDomainSelectionOpen ? "Choose Your Domain" : "Domains"}
        description={
          studentDomainSelectionOpen
            ? "Select the domain you'd like to build your project in for this cycle."
            : "Browse the available domains for this cycle."
        }
        domains={domains}
        maxSelections={1}
        canSelect={studentDomainSelectionOpen && studentCanSelect}
      />
    </main>
  )
}
