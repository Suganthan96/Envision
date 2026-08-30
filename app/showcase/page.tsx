import { PublicNav } from "@/components/public-nav"
import { ShowcaseSearch } from "@/components/showcase-search"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { getPublicShowcaseTeams } from "@/lib/public-showcase"
import { getDomains } from "@/lib/domains"
import { getSession } from "@/lib/get-session"
import { roleHome } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function ShowcasePage() {
  const [teams, domains, session] = await Promise.all([getPublicShowcaseTeams(), getDomains(), getSession()])
  const domainTitleById = Object.fromEntries(domains.map((d) => [d.id, d.title]))

  return (
    <main className="min-h-screen bg-background">
      <PublicNav isAuthenticated={!!session} dashboardHref={session ? roleHome(session.role) : undefined} />

      <div className="px-6 pt-16 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-px bg-primary" />
              <div className="w-2 h-2 rotate-45 border border-primary" />
              <div className="w-12 h-px bg-primary" />
            </div>
          </div>
          <p className="text-primary tracking-[0.3em] uppercase text-sm mb-4">EnVision 2026</p>
          <h1 className="font-serif text-5xl md:text-6xl text-foreground mb-6 text-balance">
            Project <span className="text-gold-gradient">Showcase</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Every team&apos;s prototype from this cycle — what they set out to solve, and how.
          </p>
          {teams.length > 0 && (
            <p className="text-primary text-xs uppercase tracking-[0.2em] mt-6">
              {teams.length} {teams.length === 1 ? "Team" : "Teams"}
            </p>
          )}
        </div>

        <ArtDecoDivider variant="chevron" />

        {teams.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">No teams yet.</p>
        ) : (
          <ShowcaseSearch teams={teams} domainTitleById={domainTitleById} />
        )}
      </div>
    </main>
  )
}
