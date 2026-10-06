import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { TableSkeleton } from "@/components/skeletons"
import { JUDGING_SECTIONS, type JudgingSlug } from "@/components/judging/judging-sections"
import { LiveRoundBar } from "@/components/judging/live-round-bar"

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

        <nav className="flex items-center gap-x-5 gap-y-2 flex-wrap mb-8 text-sm" aria-label="Judging sections">
          <Link
            href="/admin/judging"
            className="text-muted-foreground hover:text-primary uppercase tracking-wider"
          >
            ← Judging
          </Link>
          <span className="w-px h-4 bg-border hidden sm:block" />
          {JUDGING_SECTIONS.map((s) =>
            s.slug === active ? (
              <span key={s.slug} className="text-primary border-b border-primary pb-0.5" aria-current="page">
                {s.label}
              </span>
            ) : (
              <Link
                key={s.slug}
                href={`/admin/judging/${s.slug}`}
                className="text-muted-foreground hover:text-primary"
              >
                {s.label}
              </Link>
            ),
          )}
        </nav>

        <Suspense fallback={null}>
          <LiveRoundBar />
        </Suspense>

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
