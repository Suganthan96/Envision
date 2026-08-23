import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { EditTeamName } from "@/components/edit-team-name"
import { WebThreads } from "@/components/web-threads"
import { getSession } from "@/lib/get-session"
import { DomainSelectionPage } from "@/components/domain-selection-page"

export default async function MemberPage() {
  const session = await getSession()
  const teamName = session?.name?.trim() || session?.loginId

  return (
    <main className="min-h-screen bg-background px-6 pt-12">
      <WebThreads fixed />

      <div className="relative z-10 max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-8 h-px bg-primary" />
          <span className="font-serif text-xl text-foreground">Envision</span>
        </div>
        <LogoutButton />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto mb-6">
        <Link href="/member/timeline" className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider">
          View Program Timeline →
        </Link>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto mb-4 flex items-center gap-3">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground">
          Welcome, <span className="text-gold-gradient">{teamName}</span>
        </h1>
        <EditTeamName currentTeamName={session?.name ?? null} />
      </div>

      <div className="relative z-10">
        <DomainSelectionPage
          role="student"
          eyebrow="Student Portal"
          heading="Choose Your Domain"
          description="Select the domain you'd like to build your project in for this cycle."
          capacity={6}
          maxSelections={1}
        />
      </div>
    </main>
  )
}
