import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { TimelineView } from "@/components/timeline-view"
import { getSession } from "@/lib/get-session"
import { getAppSettings } from "@/lib/app-settings"
import { DomainSelectionPage } from "@/components/domain-selection-page"
import { getTimelinePhases } from "@/lib/timeline"
import { getFeedbackLinks } from "@/lib/feedback-links"
import { getDomains } from "@/lib/domains"

export default async function MentorPage() {
  const session = await getSession()
  const displayName = session?.name?.trim() || session?.loginId
  const { mentorDomainSelectionOpen: domainSelectionOpen, mentorCanSelect } = await getAppSettings()
  const feedbackLinks = domainSelectionOpen ? {} : await getFeedbackLinks()
  const timelinePhases = domainSelectionOpen ? [] : await getTimelinePhases()
  const domains = domainSelectionOpen ? await getDomains() : []

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

      <div className="relative z-10 max-w-4xl mx-auto mb-4">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground">
          Welcome, <span className="text-gold-gradient">{displayName}</span>
        </h1>
      </div>

      {domainSelectionOpen ? (
        <div className="relative z-10">
          <DomainSelectionPage
            role="mentor"
            eyebrow="Mentor Portal"
            heading="Choose Your Domains"
            description="Select up to 2 domains you'd like to mentor students in for this cycle."
            domains={domains}
            maxSelections={2}
            canSelect={mentorCanSelect}
          />
        </div>
      ) : (
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">EnVision 2026</p>
          <p className="text-muted-foreground text-lg mb-4">
            Domain selection isn&apos;t open yet. Here&apos;s the full session plan for the program, phase by phase.
          </p>

          <ArtDecoDivider variant="stepped" />

          <TimelineView phases={timelinePhases} feedbackLinks={feedbackLinks} />
        </div>
      )}
    </main>
  )
}
