import { notFound } from "next/navigation"
import { PublicNav } from "@/components/public-nav"
import { BackLink } from "@/components/back-link"
import { getPublicShowcaseTeam } from "@/lib/public-showcase"
import { getDomains } from "@/lib/domains"
import { getSession } from "@/lib/get-session"
import { roleHome } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function ShowcaseTeamPage({ params }: { params: Promise<{ loginId: string }> }) {
  const { loginId } = await params
  const [team, domains, session] = await Promise.all([getPublicShowcaseTeam(loginId), getDomains(), getSession()])

  if (!team) notFound()

  const displayName = team.teamName?.trim() || team.loginId
  const domainTitle = team.domainId ? domains.find((d) => d.id === team.domainId)?.title ?? null : null
  const hasProject = team.projectTitle || team.problemStatement || team.solutionShort || team.solutionLong

  return (
    <main className="min-h-screen bg-background">
      <PublicNav isAuthenticated={!!session} dashboardHref={session ? roleHome(session.role) : undefined} />

      <div className="relative z-10 px-6 py-16 max-w-3xl mx-auto">
        <BackLink label="Back to Showcase" fallbackHref="/showcase" />

        <div className="flex flex-col sm:flex-row items-start gap-8 mb-12">
          <div className="size-28 border border-border bg-card flex items-center justify-center overflow-hidden shrink-0">
            {team.teamLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.teamLogoUrl} alt={`${displayName} logo`} className="w-full h-full object-cover" />
            ) : (
              <span className="font-serif text-3xl text-primary">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="font-serif text-4xl text-foreground mb-2 text-balance">{displayName}</h1>
            {domainTitle && (
              <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5 rounded-full">
                {domainTitle}
              </span>
            )}
            {team.memberNames.length > 0 && (
              <p className="text-muted-foreground text-sm mt-3">
                <span className="text-primary/80">Team:</span> {team.memberNames.join(", ")}
              </p>
            )}
            {team.mentorName && (
              <p className="text-muted-foreground text-sm mt-1">
                <span className="text-primary/80">Mentor:</span> {team.mentorName}
              </p>
            )}
          </div>
        </div>

        {hasProject ? (
          <div className="flex flex-col gap-10 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md p-6 sm:p-10 shadow-sm">
            {team.projectTitle && (
              <div>
                <p className="text-primary text-[10px] uppercase tracking-wider mb-2">Project</p>
                <h2 className="font-serif text-2xl sm:text-3xl text-foreground text-balance">{team.projectTitle}</h2>
              </div>
            )}
            {team.problemStatement && (
              <div>
                <p className="text-primary text-[10px] uppercase tracking-wider mb-2">Problem Statement</p>
                <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap">
                  {team.problemStatement}
                </p>
              </div>
            )}
            {team.solutionShort && (
              <div>
                <p className="text-primary text-[10px] uppercase tracking-wider mb-2">Solution</p>
                <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap">{team.solutionShort}</p>
              </div>
            )}
            {team.solutionLong && (
              <div>
                <p className="text-primary text-[10px] uppercase tracking-wider mb-2">In Detail</p>
                <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-wrap">
                  {team.solutionLong}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-lg">This team hasn&apos;t published their project yet.</p>
        )}
      </div>
    </main>
  )
}
