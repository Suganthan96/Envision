import Link from "next/link"
import { Users, ArrowUpRight } from "lucide-react"
import BorderGlow from "@/components/border-glow"

interface PublicTeamCardData {
  loginId: string
  teamName: string | null
  teamLeadName: string | null
  teamLogoUrl: string | null
  projectTitle: string | null
  solutionShort: string | null
  memberNames: string[]
  mentorName: string | null
}

/** Project-forward card — the project title is the headline, the team is
 * the byline, matching a hackathon-showcase feel instead of a plain roster
 * entry. BorderGlow adds a cursor-tracking gold ring on hover; the card's
 * own background/blur/corner-glow stays underneath it regardless. */
export function PublicTeamCard({ team, domainTitle }: { team: PublicTeamCardData; domainTitle: string | null }) {
  const displayName = team.teamName?.trim() || team.loginId
  const headline = team.projectTitle?.trim() || displayName

  return (
    <BorderGlow
      className="h-full"
      backgroundColor="transparent"
      borderRadius={16}
      glowRadius={20}
      edgeSensitivity={40}
      glowColor="42 65 55"
      colors={["var(--primary)", "var(--gold-gradient-2)", "var(--gold-gradient-1)"]}
    >
      <Link
        href={`/showcase/${team.loginId}`}
        className="group relative flex flex-col h-full overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md border border-border hover:border-primary/70 transition-all duration-300 hover:-translate-y-1"
      >
        {/* Ambient corner glow behind the text area — the banner above already
            covers the top corners, so these bloom from the bottom instead. */}
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-primary/15 blur-3xl transition-opacity duration-300 group-hover:opacity-80" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-3xl transition-opacity duration-300 group-hover:opacity-80" />

        <div className="relative h-36 flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-card to-card">
          {team.teamLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.teamLogoUrl}
              alt={`${displayName} logo`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <Users className="w-10 h-10 text-primary/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          {domainTitle && (
            <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider text-primary bg-background/80 backdrop-blur-sm border border-primary/40 px-2 py-1 rounded-full">
              {domainTitle}
            </span>
          )}
          <ArrowUpRight className="absolute top-3 right-3 w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="relative flex flex-col gap-2 p-5 flex-1">
          <h3 className="font-serif text-lg text-foreground leading-snug text-balance group-hover:text-primary transition-colors">
            {headline}
          </h3>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">{displayName}</p>

          {team.memberNames.length > 0 && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              <span className="text-primary/80">Team:</span> {team.memberNames.join(", ")}
            </p>
          )}
          {team.mentorName && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              <span className="text-primary/80">Mentor:</span> {team.mentorName}
            </p>
          )}

          {team.solutionShort && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mt-1">{team.solutionShort}</p>
          )}
        </div>
      </Link>
    </BorderGlow>
  )
}
