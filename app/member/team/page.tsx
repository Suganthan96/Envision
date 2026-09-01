import Link from "next/link"
import { TeamProfileEditor } from "@/components/team-profile-editor"
import { getSession } from "@/lib/get-session"
import { getAppSettings } from "@/lib/app-settings"
import { getTeamMembers } from "@/lib/team-members"
import { getTeamLogo } from "@/lib/team-logo"
import { PortalHeader } from "@/components/portal-header"

export const dynamic = "force-dynamic"

export default async function MemberTeamPage() {
  const session = await getSession()

  // Fetched together rather than in sequence — these are independent round
  // trips to Supabase and running them serially added up to real latency.
  const [{ teamNameEditOpen }, teamMembers, teamLogo] = await Promise.all([
    getAppSettings(),
    session ? getTeamMembers(session.userId) : Promise.resolve([]),
    session ? getTeamLogo(session.userId) : Promise.resolve(null),
  ])

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <PortalHeader maxWidth="max-w-4xl" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <Link
          href="/member"
          className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider mb-8 inline-block"
        >
          ← Back to Portal
        </Link>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Student Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-10">
          Team <span className="text-gold-gradient">Profile</span>
        </h1>

        <TeamProfileEditor
          currentTeamName={session?.name ?? null}
          teamNameEditOpen={teamNameEditOpen}
          currentLogoUrl={teamLogo}
          currentMembers={teamMembers}
        />
      </div>
    </main>
  )
}
