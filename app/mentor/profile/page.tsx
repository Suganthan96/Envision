import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { MentorProfileEditor } from "@/components/mentor-profile-editor"
import { getSession } from "@/lib/get-session"
import { getMentorProfile } from "@/lib/mentor-profile"

export const dynamic = "force-dynamic"

export default async function MentorProfilePage() {
  const session = await getSession()
  const profile = session ? await getMentorProfile(session.userId) : { avatarUrl: null, bio: null }
  const displayName = session?.name?.trim() || session?.loginId || "Mentor"

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
          href="/mentor"
          className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider mb-8 inline-block"
        >
          ← Back to Portal
        </Link>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Mentor Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Your <span className="text-gold-gradient">Profile</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-10">
          Add a photo and a short description — your assigned team will see this on their dashboard.
        </p>

        <MentorProfileEditor
          currentAvatarUrl={profile.avatarUrl}
          currentBio={profile.bio}
          displayName={displayName}
        />
      </div>
    </main>
  )
}
