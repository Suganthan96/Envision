import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getSession } from "@/lib/get-session"
import { getMyMentor } from "@/lib/mentor-profile"
import { BrandLink } from "@/components/brand-link"

export const dynamic = "force-dynamic"

export default async function MemberMentorPage() {
  const session = await getSession()
  const mentor = session ? await getMyMentor(session.userId) : null
  const mentorName = mentor?.name?.trim() || mentor?.loginId

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-4xl mx-auto flex items-center justify-between mb-8">
        <BrandLink />
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
          Your <span className="text-gold-gradient">Mentor</span>
        </h1>

        {mentor ? (
          <div className="flex flex-col sm:flex-row items-start gap-10 max-w-2xl">
            <Avatar className="size-48 border border-border shrink-0">
              <AvatarImage src={mentor.avatarUrl ?? undefined} alt={mentorName} className="object-cover" />
              <AvatarFallback className="text-5xl font-serif text-primary bg-card">
                {mentorName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-serif text-3xl text-foreground mb-3">{mentorName}</h2>
              {mentor.bio ? (
                <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap">{mentor.bio}</p>
              ) : (
                <p className="text-muted-foreground text-base italic">
                  Your mentor hasn&apos;t added a description yet.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-lg">
            You haven&apos;t been assigned a mentor yet. Check back once matching is complete.
          </p>
        )}
      </div>
    </main>
  )
}
