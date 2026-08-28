import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { TeamProfileEditor } from "@/components/team-profile-editor"
import { getSession } from "@/lib/get-session"
import { getAppSettings } from "@/lib/app-settings"
import { getTeamMembers } from "@/lib/team-members"
import { getTeamLogo } from "@/lib/team-logo"

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
      <div className="relative z-10 max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-8 h-px bg-primary" />
          <span className="font-serif text-xl text-foreground">Envision</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle variant="inline" />
          <LogoutButton />
        </div>
      </div>

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
