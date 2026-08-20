import { LogoutButton } from "@/components/logout-button"
import { getSession } from "@/lib/get-session"
import { DomainSelectionPage } from "@/components/domain-selection-page"

export default async function MentorPage() {
  const session = await getSession()
  const displayName = session?.name?.trim() || session?.loginId

  return (
    <main className="min-h-screen bg-background px-6 pt-12">
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-8 h-px bg-primary" />
          <span className="font-serif text-xl text-foreground">Envision</span>
        </div>
        <LogoutButton />
      </div>

      <div className="max-w-4xl mx-auto mb-4">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground">
          Welcome, <span className="text-gold-gradient">{displayName}</span>
        </h1>
      </div>

      <DomainSelectionPage
        role="mentor"
        eyebrow="Mentor Portal"
        heading="Choose Your Domains"
        description="Select up to 2 domains you'd like to mentor students in for this cycle."
        capacity={6}
        maxSelections={2}
      />
    </main>
  )
}
