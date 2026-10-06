import { Suspense, type ReactNode } from "react"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { TableSkeleton } from "@/components/skeletons"
import type { JudgingSlug } from "@/components/judging/judging-sections"
import { JudgingBand } from "@/components/judging/judging-band"

/**
 * The frame every Judging section page shares: admin header and nav, a way
 * back to the hub, a tab strip to jump straight to any other section, the
 * live round, and the section's own content streamed in behind a skeleton.
 */
export function JudgingPage({
  active,
  title,
  description,
  suspenseKey,
  children,
}: {
  active: JudgingSlug
  title: ReactNode
  description: ReactNode
  /** Re-shows the skeleton when this changes (e.g. switching scores round). */
  suspenseKey?: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-7xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/judging" />

        <JudgingBand active={active} />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal · Judging</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">{title}</h1>
        <p className="text-muted-foreground text-lg mb-10">{description}</p>

        <Suspense key={suspenseKey} fallback={<TableSkeleton />}>
          {children}
        </Suspense>
      </div>
    </main>
  )
}
