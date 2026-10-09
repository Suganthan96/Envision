import { Suspense } from "react"
import { PublicNav } from "@/components/public-nav"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { CardGridSkeleton } from "@/components/skeletons"
import { getSession } from "@/lib/get-session"
import { roleHome } from "@/lib/session"
import { PublicYearPicker } from "@/components/public-year-picker"
import { getCurrentEdition, getEditions, validEditionId } from "@/lib/edition"
import { ShowcaseGrid } from "./showcase-grid"

export const dynamic = "force-dynamic"

export default async function ShowcasePage({
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
  // Anyone may browse an earlier year here; the page is read-only.
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
          <h1 className="font-serif text-5xl md:text-6xl text-foreground text-balance">
            Project <span className="text-gold-gradient">Showcase</span>
          </h1>
          <PublicYearPicker years={years} active={edition.id} basePath="/showcase" />
        </div>

        <ArtDecoDivider variant="chevron" />

        {/* Framing quote for the gallery, in the same treatment as the
            testimonial on the landing page. It replaces the old subtitle,
            which said the same thing a line above the fold. */}
        <div className="relative text-center max-w-3xl mx-auto pt-10 pb-12">
          <div
            aria-hidden
            className="absolute top-0 left-1/2 -translate-x-1/2 text-primary/20 font-serif text-8xl leading-none select-none"
          >
            &ldquo;
          </div>

          <blockquote className="relative z-10">
            <p className="font-serif text-2xl md:text-3xl text-foreground leading-relaxed italic text-balance">
              Every Team Began With a Question
            </p>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mt-4 text-balance">
              What they chose to solve, and the shape their answer finally took.
            </p>
          </blockquote>
        </div>

        <Suspense key={edition.id} fallback={<CardGridSkeleton />}>
          <ShowcaseGrid edition={edition.id} pastYear={edition.id !== current.id} />
        </Suspense>
      </div>
    </main>
  )
}
