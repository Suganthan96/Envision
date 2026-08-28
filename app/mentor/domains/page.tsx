import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { DomainSelectionPage } from "@/components/domain-selection-page"
import { getAppSettings } from "@/lib/app-settings"
import { getDomains } from "@/lib/domains"
import { BrandLink } from "@/components/brand-link"

export const dynamic = "force-dynamic"

export default async function MentorDomainsPage() {
  const [{ mentorDomainSelectionOpen, mentorCanSelect }, domains] = await Promise.all([
    getAppSettings(),
    getDomains(),
  ])

  // Mirrors the student page: the copy follows whether selection is actually
  // open, not just whether the screen is visible.
  const canSelect = mentorDomainSelectionOpen && mentorCanSelect

  return (
    <main className="min-h-screen bg-background px-6 py-6">
      <div className="relative z-10 max-w-5xl mx-auto flex items-center justify-between mb-2">
        <BrandLink />
        <div className="flex items-center gap-3">
          <ThemeToggle variant="inline" />
          <LogoutButton />
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <Link
          href="/mentor"
          className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider inline-block"
        >
          ← Back to Portal
        </Link>
      </div>

      <DomainSelectionPage
        role="mentor"
        eyebrow="Mentor Portal"
        heading={canSelect ? "Choose Your Domains" : "Domains"}
        description={
          canSelect
            ? "Select up to 2 domains you'd like to mentor students in for this cycle."
            : "Browse the available domains for this cycle."
        }
        domains={domains}
        maxSelections={2}
        canSelect={canSelect}
      />
    </main>
  )
}
