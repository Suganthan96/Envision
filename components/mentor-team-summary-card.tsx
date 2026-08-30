import Link from "next/link"
import { Users, UserRound } from "lucide-react"
import { TeamProgressBars } from "@/components/team-progress-bars"

interface TeamSummaryData {
  loginId: string
  teamName: string | null
  teamLogoUrl: string | null
  memberCount: number
  problemStatement: string | null
  solutionShort: string | null
  solutionLong: string | null
}

export function MentorTeamSummaryCard({
  team,
  domainTitle,
  href,
  mentorName,
}: {
  team: TeamSummaryData
  domainTitle: string | null
  href: string
  mentorName?: string | null
}) {
  const displayName = team.teamName?.trim() || team.loginId

  return (
    <Link
      href={href}
      className="group relative p-6 bg-card/40 border border-border hover:border-primary transition-all duration-500 flex flex-col items-center text-center gap-3"
    >
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />

      <div className="size-20 border border-border bg-card flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500">
        {team.teamLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.teamLogoUrl} alt={`${displayName} logo`} className="w-full h-full object-cover" />
        ) : (
          <Users className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      <h3 className="font-serif text-xl text-foreground">{displayName}</h3>

      {mentorName !== undefined && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserRound className="w-3.5 h-3.5 text-primary shrink-0" />
          {mentorName?.trim() ? (
            <>Mentor: <span className="text-foreground">{mentorName}</span></>
          ) : (
            <span className="italic">No mentor assigned</span>
          )}
        </span>
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {domainTitle && (
          <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5">
            {domainTitle}
          </span>
        )}
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5">
          #{team.loginId}
        </span>
      </div>

      <TeamProgressBars
        items={[
          { label: "Team Roster", done: team.memberCount > 0 },
          { label: "Problem Statement", done: !!team.problemStatement?.trim() },
          { label: "Solution", done: !!team.solutionShort?.trim() },
          { label: "Full Solution", done: !!team.solutionLong?.trim() },
          { label: "PPT Upload", done: false, pending: true },
        ]}
      />
    </Link>
  )
}
