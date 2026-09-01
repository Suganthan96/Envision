import Link from "next/link"
import { MentorTeamSummaryCard } from "@/components/mentor-team-summary-card"
import { getSession } from "@/lib/get-session"
import { getMyTeams } from "@/lib/mentor-teams"
import { getDomains } from "@/lib/domains"
import { PortalHeader } from "@/components/portal-header"

export const dynamic = "force-dynamic"

export default async function MentorTeamsPage() {
  const session = await getSession()
  const [teams, domains] = await Promise.all([
    session ? getMyTeams(session.userId) : Promise.resolve([]),
    getDomains(),
  ])

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <PortalHeader maxWidth="max-w-4xl" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <Link
          href="/mentor"
          className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider mb-8 inline-block"
        >
          ← Back to Portal
        </Link>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Mentor Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-10">
          My <span className="text-gold-gradient">Teams</span>
        </h1>

        {teams.length === 0 ? (
          <p className="text-muted-foreground text-lg">
            No teams have been assigned to you yet. Check back once matching is complete.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <MentorTeamSummaryCard
                key={team.studentUserId}
                team={team}
                domainTitle={domains.find((d) => d.id === team.domainId)?.title ?? null}
                href={`/mentor/teams/${team.studentUserId}`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
