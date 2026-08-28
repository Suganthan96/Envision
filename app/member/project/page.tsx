import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { TeamProjectEditor } from "@/components/team-project-editor"
import { getSession } from "@/lib/get-session"
import { getTeamProject } from "@/lib/team-project"
import { BrandLink } from "@/components/brand-link"

export const dynamic = "force-dynamic"

export default async function MemberProjectPage() {
  const session = await getSession()
  const project = session
    ? await getTeamProject(session.userId)
    : { projectTitle: null, problemStatement: null, solutionShort: null, solutionLong: null }

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
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Your <span className="text-gold-gradient">Project</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-10">
          Your mentor will see this on their dashboard. You can come back and edit it anytime.
        </p>

        <TeamProjectEditor currentProject={project} />
      </div>
    </main>
  )
}
