import { AdminNav } from "@/components/admin-nav"
import { TimelineEditor } from "@/components/timeline-editor"
import { getTimelinePhases } from "@/lib/timeline"
import { getFeedbackLinks } from "@/lib/feedback-links"
import { AdminHeader } from "@/components/admin-header"

export const dynamic = "force-dynamic"

export default async function AdminTimelinePage() {
  const [phases, feedbackLinks] = await Promise.all([getTimelinePhases(), getFeedbackLinks()])

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/timeline" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Program <span className="text-gold-gradient">Timeline</span>
        </h1>

        <TimelineEditor initialPhases={phases} initialFeedbackLinks={feedbackLinks} />
      </div>
    </main>
  )
}
