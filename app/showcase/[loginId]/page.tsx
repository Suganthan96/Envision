import { notFound } from "next/navigation"
import { PublicNav } from "@/components/public-nav"
import { BackLink } from "@/components/back-link"
import { getPublicShowcaseTeam } from "@/lib/public-showcase"
import { getDomains } from "@/lib/domains"
import { getSession } from "@/lib/get-session"
import { getCurrentEdition, validEditionId, withEdition } from "@/lib/edition"
import { roleHome } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function ShowcaseTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ loginId: string }>
  searchParams: Promise<{ from?: string | string[]; year?: string | string[] }>
}) {
  const [{ loginId }, { from, year }] = await Promise.all([params, searchParams])
  const edition = (await validEditionId(typeof year === "string" ? year : null)) ?? (await getCurrentEdition()).id
  const [team, domains, session] = await Promise.all([
    withEdition(edition, () => getPublicShowcaseTeam(loginId)),
    withEdition(edition, () => getDomains()),
    getSession(),
  ])

  if (!team) notFound()

  const displayName = team.teamName?.trim() || team.loginId
  const domainTitle = team.domainId ? domains.find((d) => d.id === team.domainId)?.title ?? null : null
  const hasProject = team.projectTitle || team.problemStatement || team.solutionShort || team.solutionLong

  return (
    <main className="min-h-screen bg-background">
      <PublicNav isAuthenticated={!!session} dashboardHref={session ? roleHome(session.role) : undefined} />

      <div className="relative z-10 px-6 py-16 max-w-6xl mx-auto">
        {from === "leaderboard" && (session?.role === "member" || session?.role === "mentor") ? (
          <BackLink label="Back to Leaderboard" fallbackHref={`/${session.role}/leaderboard`} />
        ) : (
          <BackLink label="Back to Showcase" fallbackHref={typeof year === "string" ? `/showcase?year=${edition}` : "/showcase"} />
        )}

        {/* Header: who the team is and what it built, across the full width. */}
        <header className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8 mb-12">
          <div className="size-28 sm:size-32 border border-border bg-card flex items-center justify-center overflow-hidden shrink-0 rounded-lg">
            {team.teamLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.teamLogoUrl} alt={`${displayName} logo`} className="w-full h-full object-cover" />
            ) : (
              <span className="font-serif text-4xl text-primary">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm mb-1">Team #{team.loginId}</p>
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-3 text-balance">{displayName}</h1>
            {domainTitle && (
              <span className="inline-block text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-2 py-0.5 rounded-full">
                {domainTitle}
              </span>
            )}
            {team.projectTitle && (
              <p className="font-serif text-xl md:text-2xl text-primary mt-5 max-w-3xl text-balance">{team.projectTitle}</p>
            )}
          </div>
        </header>

        <div className="grid gap-8 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
          {/* The project, at a comfortable reading width. */}
          {hasProject && (team.problemStatement || team.solutionShort || team.solutionLong) ? (
            <article className="flex flex-col gap-10 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md p-6 sm:p-10 shadow-sm min-w-0">
              {team.problemStatement && (
                <section>
                  <h2 className="text-primary text-[10px] uppercase tracking-wider mb-3">Problem Statement</h2>
                  <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap max-w-[70ch]">
                    {team.problemStatement}
                  </p>
                </section>
              )}
              {team.solutionShort && (
                <section>
                  <h2 className="text-primary text-[10px] uppercase tracking-wider mb-3">Solution</h2>
                  <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap max-w-[70ch]">
                    {team.solutionShort}
                  </p>
                </section>
              )}
              {team.solutionLong && (
                <section>
                  <h2 className="text-primary text-[10px] uppercase tracking-wider mb-3">In Detail</h2>
                  <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-wrap max-w-[70ch]">
                    {team.solutionLong}
                  </p>
                </section>
              )}
            </article>
          ) : (
            <p className="text-muted-foreground text-lg">This team hasn&apos;t published their project yet.</p>
          )}

          {/* Who's behind it; stays in view while the project scrolls. */}
          <aside className="lg:sticky lg:top-8 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md p-6 flex flex-col gap-6">
            {team.memberNames.length > 0 && (
              <div>
                <h2 className="text-primary text-[10px] uppercase tracking-wider mb-3">
                  Team · {team.memberNames.length} {team.memberNames.length === 1 ? "member" : "members"}
                </h2>
                <ul className="flex flex-col gap-1.5 text-sm text-foreground">
                  {team.memberNames.map((name, i) => (
                    <li key={`${name}-${i}`} className="break-words">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {team.mentorName && (
              <div>
                <h2 className="text-primary text-[10px] uppercase tracking-wider mb-2">Mentor</h2>
                <p className="text-sm text-foreground">{team.mentorName}</p>
              </div>
            )}
            {domainTitle && (
              <div>
                <h2 className="text-primary text-[10px] uppercase tracking-wider mb-2">Theme</h2>
                <p className="text-sm text-foreground">{domainTitle}</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
