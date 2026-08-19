import { LogoutButton } from "@/components/logout-button"
import { getSession } from "@/lib/get-session"

export default async function MemberPage() {
  const session = await getSession()

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <div className="w-8 h-px bg-primary" />
            <span className="font-serif text-xl text-foreground">Envision</span>
          </div>
          <LogoutButton />
        </div>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Member Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Welcome, <span className="text-gold-gradient">Member {session?.loginId}</span>
        </h1>
        <p className="text-muted-foreground text-lg">Your member dashboard content will appear here.</p>
      </div>
    </main>
  )
}
