import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { EditTeamName } from "@/components/edit-team-name"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { TimelineView } from "@/components/timeline-view"
import { getSession } from "@/lib/get-session"
import { getAppSettings } from "@/lib/app-settings"
import { DomainSelectionPage } from "@/components/domain-selection-page"
import { getTimelinePhases } from "@/lib/timeline"
import { getFeedbackLinks } from "@/lib/feedback-links"

export default async function MemberPage() {
  const session = await getSession()
  const teamName = session?.name?.trim() || session?.loginId
  const {
    studentDomainSelectionOpen: domainSelectionOpen,
    studentCanSelect,
    teamNameEditOpen,
  } = await getAppSettings()
  const feedbackLinks = domainSelectionOpen ? {} : await getFeedbackLinks()
  const timelinePhases = domainSelectionOpen ? [] : await getTimelinePhases()

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

      {domainSelectionOpen && (
        <div className="relative z-10 max-w-4xl mx-auto mb-6">
          <Link href="/member/timeline" className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider">
            View Program Timeline →
          </Link>
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto mb-4 flex items-center gap-3">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground">
          Welcome, <span className="text-gold-gradient">{teamName}</span>
        </h1>
        {teamNameEditOpen && <EditTeamName currentTeamName={session?.name ?? null} />}
      </div>

      {domainSelectionOpen ? (
        <div className="relative z-10">
          <DomainSelectionPage
            role="student"
            eyebrow="Student Portal"
            heading="Choose Your Domain"
            description="Select the domain you'd like to build your project in for this cycle."
            maxSelections={1}
            canSelect={studentCanSelect}
          />
        </div>
      ) : (
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">EnVision 2026</p>
          <p className="text-muted-foreground text-lg mb-8">
            Domain selection isn&apos;t open yet. In the meantime, take a look at the full session plan for the
            program.
          </p>

          <ArtDecoDivider variant="stepped" />

          <TimelineView phases={timelinePhases} feedbackLinks={feedbackLinks} />
        </div>
      )}
    </main>
  )
}
