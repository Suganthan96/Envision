import { Users } from "lucide-react"
import type { MentorTeam } from "@/lib/mentor-teams"

export function MentorTeamCard({ team, domainTitle }: { team: MentorTeam; domainTitle: string | null }) {
  const displayName = team.teamName?.trim() || team.loginId
  const hasProject = team.problemStatement || team.solutionShort || team.solutionLong

  return (
    <div className="relative p-6 bg-card/40 border border-border flex flex-col items-center text-center gap-4">
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />

      <div className="size-20 border border-border bg-card flex items-center justify-center overflow-hidden shrink-0">
        {team.teamLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.teamLogoUrl} alt={`${displayName} logo`} className="w-full h-full object-cover" />
        ) : (
          <Users className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      <div>
        <h3 className="font-serif text-xl text-foreground mb-1">{displayName}</h3>
        {team.teamLeadName && <p className="text-muted-foreground text-sm">{team.teamLeadName}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
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
      </div>

      {hasProject ? (
        <div className="w-full text-left flex flex-col gap-3 pt-4 border-t border-border">
          {team.problemStatement && (
            <div>
              <p className="text-primary text-[10px] uppercase tracking-wider mb-1">Problem Statement</p>
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{team.problemStatement}</p>
            </div>
          )}
          {team.solutionShort && (
            <div>
              <p className="text-primary text-[10px] uppercase tracking-wider mb-1">Solution</p>
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{team.solutionShort}</p>
            </div>
          )}
          {team.solutionLong && (
            <details className="group">
              <summary className="text-primary text-[10px] uppercase tracking-wider mb-1 cursor-pointer select-none list-none flex items-center gap-1">
                Full Solution
                <span className="group-open:rotate-90 transition-transform">›</span>
              </summary>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap mt-1">
                {team.solutionLong}
              </p>
            </details>
          )}
        </div>
      ) : (
        <p className="w-full text-left text-muted-foreground text-xs italic pt-4 border-t border-border">
          This team hasn&apos;t added their project details yet.
        </p>
      )}
    </div>
  )
}
