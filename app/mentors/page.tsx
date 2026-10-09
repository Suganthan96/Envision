import { Suspense } from "react"
import { PublicNav } from "@/components/public-nav"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { CardGridSkeleton } from "@/components/skeletons"
import { getSession } from "@/lib/get-session"
import { roleHome } from "@/lib/session"
import { PublicYearPicker } from "@/components/public-year-picker"
import { getCurrentEdition, getEditions, validEditionId } from "@/lib/edition"
import { MentorsGrid } from "./mentors-grid"

export const dynamic = "force-dynamic"

export default async function PublicMentorsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>
}) {
  const { year } = await searchParams
  const [session, years, current, picked] = await Promise.all([
    getSession(),
    getEditions(),
    getCurrentEdition(),
    validEditionId(typeof year === "string" ? year : null),
  ])
  const edition = years.find((y) => y.id === picked) ?? current

  return (
    <main className="min-h-screen bg-background">
      <PublicNav isAuthenticated={!!session} dashboardHref={session ? roleHome(session.role) : undefined} />

      <div className="px-6 pt-16 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-px bg-primary" />
              <div className="w-2 h-2 rotate-45 border border-primary" />
              <div className="w-12 h-px bg-primary" />
            </div>
          </div>
          <p className="text-primary tracking-[0.3em] uppercase text-sm mb-4">EnVision {edition.label}</p>
          <h1 className="font-serif text-5xl md:text-6xl text-foreground mb-6 text-balance">
            Meet the <span className="text-gold-gradient">Mentors</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            {edition.id === current.id
              ? "The mentors guiding teams through this cycle."
              : `The mentors who guided teams in ${edition.label}.`}
          </p>
          <PublicYearPicker years={years} active={edition.id} basePath="/mentors" />
        </div>

        <ArtDecoDivider variant="chevron" />

        <Suspense key={edition.id} fallback={<CardGridSkeleton />}>
          <MentorsGrid edition={edition.id} />
        </Suspense>
      </div>
    </main>
  )
}
