import { AdminHeader } from "@/components/admin-header"
import { AdminNav } from "@/components/admin-nav"
import { GuidelineEditor } from "@/components/guideline-editor"
import { getProjectGuideline } from "@/lib/project-guideline"

export const dynamic = "force-dynamic"

export default async function AdminGuidelinesPage() {
  const guideline = await getProjectGuideline()

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/guidelines" />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4 text-balance">{guideline.title}</h1>
        <p className="text-muted-foreground text-lg mb-12">
          Edit the slide deck students and mentors see explaining how to approach their project. They can view it,
          but not edit it.
        </p>

        <GuidelineEditor initialGuideline={guideline} />
      </div>
    </main>
  )
}
