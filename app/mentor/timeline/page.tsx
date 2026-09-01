import Link from "next/link"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { TimelineView } from "@/components/timeline-view"
import { getTimelinePhases } from "@/lib/timeline"
import { getFeedbackLinks } from "@/lib/feedback-links"
import { PortalHeader } from "@/components/portal-header"

export const dynamic = "force-dynamic"

export default async function MentorTimelinePage() {
  const [feedbackLinks, timelinePhases] = await Promise.all([getFeedbackLinks(), getTimelinePhases()])

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <PortalHeader maxWidth="max-w-4xl" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <Link
          href="/mentor"
          className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider mb-8 inline-block"
        >
          ← Back to Portal
        </Link>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">EnVision 2026</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Interdepartmental <span className="text-gold-gradient">Prototype Contest</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-4">Full session plan for the program, phase by phase.</p>

        <ArtDecoDivider variant="stepped" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <TimelineView phases={timelinePhases} feedbackLinks={feedbackLinks} />
      </div>
    </main>
  )
}
