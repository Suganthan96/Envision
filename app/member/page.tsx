import { LogoutButton } from "@/components/logout-button"
import { getSession } from "@/lib/get-session"
import { DomainSelectionPage } from "@/components/domain-selection-page"

export default async function MemberPage() {
  const session = await getSession()

  return (
    <main className="min-h-screen bg-background px-6 pt-12">
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-8 h-px bg-primary" />
          <span className="font-serif text-xl text-foreground">Envision</span>
        </div>
        <LogoutButton />
      </div>

      <DomainSelectionPage
        role="student"
        eyebrow="Student Portal"
        heading="Choose Your Domain"
        description="Select the domain you'd like to build your project in for this cycle."
        multiSelect={false}
        defaultName={session?.loginId}
      />
    </main>
  )
}
