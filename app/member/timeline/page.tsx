import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { TimelineView } from "@/components/timeline-view"
import { TIMELINE_PHASES } from "@/lib/timeline"

export default function MemberTimelinePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-8 h-px bg-primary" />
          <span className="font-serif text-xl text-foreground">Envision</span>
        </div>
        <LogoutButton />
      </div>

      <div className="max-w-4xl mx-auto">
        <Link
          href="/member"
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

        <TimelineView phases={TIMELINE_PHASES} />
      </div>
    </main>
  )
}
