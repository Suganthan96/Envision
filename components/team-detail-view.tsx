import Link from "next/link"
import type { TeamMember } from "@/lib/team-members"

interface TeamDetailData {
  loginId: string
  teamName: string | null
  teamLeadName: string | null
  teamLogoUrl: string | null
  venue: string | null
  problemStatement: string | null
  solutionShort: string | null
  solutionLong: string | null
}

export function TeamDetailView({
  team,
  domainTitle,
  members,
  eyebrow,
  backHref,
  backLabel,
}: {
  team: TeamDetailData
  domainTitle: string | null
  members: TeamMember[]
  eyebrow: string
  backHref: string
  backLabel: string
}) {
  const displayName = team.teamName?.trim() || team.loginId
  const hasProject = team.problemStatement || team.solutionShort || team.solutionLong

  return (
    <>
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider mb-8 inline-block"
      >
        ← {backLabel}
      </Link>

      <div className="flex flex-col sm:flex-row items-start gap-8 mb-10">
        <div className="size-32 border border-border bg-card flex items-center justify-center overflow-hidden shrink-0">
          {team.teamLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.teamLogoUrl} alt={`${displayName} logo`} className="w-full h-full object-cover" />
          ) : (
            <span className="font-serif text-4xl text-primary">{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div>
          <p className="text-primary tracking-[0.2em] uppercase text-sm mb-2">{eyebrow}</p>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">{displayName}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            {domainTitle && (
              <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5">
                {domainTitle}
              </span>
            )}
            {team.venue && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5">
                {team.venue}
              </span>
            )}
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5">
              #{team.loginId}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <section>
          <h2 className="font-serif text-2xl text-foreground mb-4">Roster</h2>
          {team.teamLeadName && (
            <p className="text-muted-foreground text-sm mb-3">
              <span className="text-primary">Team Lead:</span> {team.teamLeadName}
            </p>
          )}
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No members added yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {members.map((m) => (
                <div key={m.id} className="border border-border bg-card/40 p-3">
                  <p className="text-foreground text-sm font-medium">{m.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {[m.department, m.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-serif text-2xl text-foreground mb-4">Project</h2>
          {hasProject ? (
            <div className="flex flex-col gap-6">
              {team.problemStatement && (
                <div>
                  <p className="text-primary text-[10px] uppercase tracking-wider mb-1">Problem Statement</p>
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {team.problemStatement}
                  </p>
                </div>
              )}
              {team.solutionShort && (
                <div>
                  <p className="text-primary text-[10px] uppercase tracking-wider mb-1">Solution — In a Few Words</p>
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{team.solutionShort}</p>
                </div>
              )}
              {team.solutionLong && (
                <div>
                  <p className="text-primary text-[10px] uppercase tracking-wider mb-1">Solution — In Detail</p>
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {team.solutionLong}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">This team hasn&apos;t added their project details yet.</p>
          )}
        </section>
      </div>
    </>
  )
}
