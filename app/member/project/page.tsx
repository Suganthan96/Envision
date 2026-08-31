import Link from "next/link"
import { TeamProjectEditor } from "@/components/team-project-editor"
import { TeamSubmissionEditor } from "@/components/team-submission-editor"
import { getSession } from "@/lib/get-session"
import { getTeamProject } from "@/lib/team-project"
import { getTeamSubmission, EMPTY_SUBMISSION } from "@/lib/team-submission"
import { PortalHeader } from "@/components/portal-header"

export const dynamic = "force-dynamic"

export default async function MemberProjectPage() {
  const session = await getSession()
  const [project, submission] = await Promise.all([
    session
      ? getTeamProject(session.userId)
      : Promise.resolve({ projectTitle: null, problemStatement: null, solutionShort: null, solutionLong: null }),
    session ? getTeamSubmission(session.userId) : Promise.resolve(EMPTY_SUBMISSION),
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
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Your <span className="text-gold-gradient">Project</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-10">
          Your mentor will see this on their dashboard. You can come back and edit it anytime.
        </p>

        <TeamProjectEditor currentProject={project} />

        <div className="border-t border-border mt-14 pt-12">
          <h2 className="font-serif text-3xl text-foreground mb-2">
            Final <span className="text-gold-gradient">Submission</span>
          </h2>
          <p className="text-muted-foreground mb-8">
            Your presentation deck for judging — a Canva link and/or an uploaded file.
          </p>
          <TeamSubmissionEditor
            teamNo={session?.loginId ?? ""}
            driveFolderUrl={process.env.NEXT_PUBLIC_SUBMISSION_DRIVE_FOLDER_URL ?? ""}
            current={submission}
          />
        </div>
      </div>
    </main>
  )
}
