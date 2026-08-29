import { PublicNav } from "@/components/public-nav"
import { MentorsSearch } from "@/components/mentors-search"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { getPublicMentorShowcase } from "@/lib/public-showcase"
import { getDomains } from "@/lib/domains"

export const dynamic = "force-dynamic"

export default async function PublicMentorsPage() {
  const [mentors, domains] = await Promise.all([getPublicMentorShowcase(), getDomains()])
  const domainTitleById = Object.fromEntries(domains.map((d) => [d.id, d.title]))

  return (
    <main className="min-h-screen bg-background">
      <PublicNav />

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
            Meet the <span className="text-gold-gradient">Mentors</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            The mentors guiding teams through this cycle.
          </p>
          {mentors.length > 0 && (
            <p className="text-primary text-xs uppercase tracking-[0.2em] mt-6">
              {mentors.length} {mentors.length === 1 ? "Mentor" : "Mentors"}
            </p>
          )}
        </div>

        <ArtDecoDivider variant="chevron" />

        {mentors.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">No mentors yet.</p>
        ) : (
          <MentorsSearch mentors={mentors} domainTitleById={domainTitleById} />
        )}
      </div>
    </main>
  )
}
