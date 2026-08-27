import Link from "next/link"
import { notFound } from "next/navigation"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdminMentorProfileCard } from "@/components/admin-mentor-profile-card"
import { getSession } from "@/lib/get-session"
import { getMentorProfilesForAdmin } from "@/lib/admin-directories"
import { getDomains } from "@/lib/domains"

export const dynamic = "force-dynamic"

export default async function AdminMentorProfileDetailPage({
  params,
}: {
  params: Promise<{ mentorUserId: string }>
}) {
  const { mentorUserId } = await params
  const session = await getSession()

  const [mentors, domains] = await Promise.all([
    session ? getMentorProfilesForAdmin(session.userId) : Promise.resolve([]),
    getDomains(),
  ])

  const mentor = mentors.find((m) => m.mentorUserId === mentorUserId)
  if (!mentor) notFound()

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <div className="w-8 h-px bg-primary" />
            <span className="font-serif text-xl text-foreground">Envision</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="inline" />
            <LogoutButton />
          </div>
        </div>

        <Link
          href="/admin/mentor-profiles"
          className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider mb-8 inline-block"
        >
          ← Back to Mentor Profiles
        </Link>

        <AdminMentorProfileCard
          mentor={mentor}
          domainTitles={mentor.domainIds.map((id) => domains.find((d) => d.id === id)?.title ?? id)}
        />
      </div>
    </main>
  )
}
