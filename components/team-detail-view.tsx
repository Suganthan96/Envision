import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { BackLink } from "@/components/back-link"
import { formatDate } from "@/lib/format-date"
import type { TeamMember } from "@/lib/team-members"

interface TeamDetailData {
  loginId: string
  teamName: string | null
  teamLeadName: string | null
  teamLogoUrl: string | null
  venue: string | null
  projectTitle: string | null
  problemStatement: string | null
  solutionShort: string | null
  solutionLong: string | null
  submissionDriveUrl?: string | null
  submissionCanvaUrl?: string | null
  submissionUpdatedAt?: string | null
}

interface TeamMentor {
  mentorUserId: string
  name: string | null
  loginId: string
  avatarUrl: string | null
}

export function TeamDetailView({
  team,
  domainTitle,
  members,
  eyebrow,
  backHref,
  backLabel,
  mentor,
  mentorHref,
}: {
  team: TeamDetailData
  domainTitle: string | null
  members: TeamMember[]
  eyebrow: string
  backHref: string
  backLabel: string
  mentor?: TeamMentor | null
  mentorHref?: (mentorUserId: string) => string
}) {
  const displayName = team.teamName?.trim() || team.loginId
  const hasProject = team.projectTitle || team.problemStatement || team.solutionShort || team.solutionLong
  const hasSubmission = Boolean(team.submissionDriveUrl || team.submissionCanvaUrl)

  return (
    <>
      <BackLink label={backLabel} fallbackHref={backHref} />

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
        {mentor !== undefined && (
          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">Mentor</h2>
            {mentor ? (
              <MentorSummary mentor={mentor} href={mentorHref?.(mentor.mentorUserId)} />
            ) : (
              <p className="text-muted-foreground text-sm italic">No mentor has been assigned yet.</p>
            )}
          </section>
        )}

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
              {team.projectTitle && (
                <div>
                  <p className="text-primary text-[10px] uppercase tracking-wider mb-1">Project Title</p>
                  <p className="font-serif text-xl text-foreground">{team.projectTitle}</p>
                </div>
              )}
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

        <section>
          <h2 className="font-serif text-2xl text-foreground mb-4">Submission</h2>
          {hasSubmission ? (
            <div className="flex flex-col gap-2">
              {team.submissionDriveUrl && (
                <a
                  href={team.submissionDriveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 border border-border bg-card/40 px-3 py-2 w-fit max-w-full text-sm text-foreground hover:border-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">Drive: {team.submissionDriveUrl}</span>
                </a>
              )}
              {team.submissionCanvaUrl && (
                <a
                  href={team.submissionCanvaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 border border-border bg-card/40 px-3 py-2 w-fit max-w-full text-sm text-foreground hover:border-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">Canva: {team.submissionCanvaUrl}</span>
                </a>
              )}
              {team.submissionUpdatedAt && (
                <p className="text-muted-foreground text-xs">
                  Updated {formatDate(team.submissionUpdatedAt)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">No submission yet.</p>
          )}
        </section>
      </div>
    </>
  )
}

function MentorSummary({ mentor, href }: { mentor: TeamMentor; href?: string }) {
  const displayName = mentor.name?.trim() || mentor.loginId

  const content = (
    <div className="flex items-center gap-3 border border-border bg-card/40 p-3 w-fit">
      <div className="size-10 rounded-full border border-border bg-card flex items-center justify-center overflow-hidden shrink-0">
        {mentor.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mentor.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span className="font-serif text-sm text-primary">{displayName.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div>
        <p className="text-foreground text-sm font-medium">{displayName}</p>
        <p className="text-muted-foreground text-xs font-mono">{mentor.loginId}</p>
      </div>
    </div>
  )

  return href ? (
    <Link href={href} className="hover:opacity-80 transition-opacity">
      {content}
    </Link>
  ) : (
    content
  )
}
