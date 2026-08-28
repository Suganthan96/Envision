import Link from "next/link"
import { MentorProfileEditor } from "@/components/mentor-profile-editor"
import { getSession } from "@/lib/get-session"
import { getMentorProfile } from "@/lib/mentor-profile"
import { PortalHeader } from "@/components/portal-header"

export const dynamic = "force-dynamic"

export default async function MentorProfilePage() {
  const session = await getSession()
  const profile = session ? await getMentorProfile(session.userId) : { avatarUrl: null, bio: null }
  const displayName = session?.name?.trim() || session?.loginId || "Mentor"

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
