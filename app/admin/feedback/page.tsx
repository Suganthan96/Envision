import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { FeedbackLinkEditor, type FeedbackLinkRow } from "@/components/feedback-link-editor"
import { TIMELINE_PHASES } from "@/lib/timeline"
import { getFeedbackLinks } from "@/lib/feedback-links"

export const dynamic = "force-dynamic"

export default async function AdminFeedbackPage() {
  const links = await getFeedbackLinks()

  const sessionDays = (TIMELINE_PHASES.find((phase) => phase.id === "phase-1")?.entries ?? []).filter(
    (entry) => entry.hasFeedbackForm,
  )
  const rows: FeedbackLinkRow[] = sessionDays.map((entry) => ({
    entryId: entry.id,
    label: entry.label,
    title: entry.title,
    url: links[entry.id] ?? "",
  }))

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <div className="w-8 h-px bg-primary" />
            <span className="font-serif text-xl text-foreground">Envision</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="inline" />
            <LogoutButton />
          </div>
        </div>

        <div className="flex items-center gap-6 mb-8 flex-wrap">
          <Link href="/admin" className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider">
            User Management
          </Link>
          <Link
            href="/admin/mentors"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Mentor Selections
          </Link>
          <Link
            href="/admin/students"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Student Selections
          </Link>
          <span className="text-primary text-sm uppercase tracking-wider border-b border-primary pb-1">
            Feedback Links
          </span>
        </div>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Session <span className="text-gold-gradient">Feedback Links</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Add or edit the Google Form link for each session day. Leave a field blank and save to remove a link.
        </p>

        <FeedbackLinkEditor rows={rows} />
      </div>
    </main>
  )
}
