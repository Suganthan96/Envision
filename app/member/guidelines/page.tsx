import { PortalHeader } from "@/components/portal-header"
import { BackLink } from "@/components/back-link"
import { GuidelineViewer } from "@/components/guideline-viewer"
import { getProjectGuideline } from "@/lib/project-guideline"
import { withRubricSlide } from "@/lib/rubric-slide"

export const dynamic = "force-dynamic"

export default async function MemberGuidelinesPage() {
  const guideline = await getProjectGuideline()
  const slides = await withRubricSlide(guideline.slides)

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <PortalHeader maxWidth="max-w-4xl" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <BackLink label="Back to Portal" fallbackHref="/member" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Student Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-10 text-balance">{guideline.title}</h1>

        <GuidelineViewer slides={slides} fileName={guideline.fileName} />
      </div>
    </main>
  )
}
