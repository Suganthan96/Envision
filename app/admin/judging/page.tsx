import { Suspense } from "react"
import {
  Calculator,
  ClipboardList,
  FileDown,
  FileText,
  ListChecks,
  MapPin,
  UserCheck,
} from "lucide-react"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { DashboardNavCard } from "@/components/dashboard-nav-card"
import { TableSkeleton } from "@/components/skeletons"
import { JUDGING_GROUPS, type JudgingSlug } from "@/components/judging/judging-sections"
import { JudgingBand } from "@/components/judging/judging-band"
import { getSession } from "@/lib/get-session"
import { getSubmissionsForAdmin } from "@/lib/admin-directories"
import { getJudgingAssignments, getJudgingVenues, resolveJudgingVenue } from "@/lib/judging"
import { getEvaluators, getRubricPresets } from "@/lib/evaluation"
import { getRoundScoreSummaries } from "@/lib/round-scores"

export const dynamic = "force-dynamic"

const ICONS: Record<JudgingSlug, React.ReactNode> = {
  submissions: <FileText />,
  venues: <MapPin />,
  documents: <FileDown />,
  rounds: <ListChecks />,
  evaluators: <UserCheck />,
  scores: <Calculator />,
  sheets: <ClipboardList />,
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** One line of live state per card, so the hub shows where judging stands. */
async function HubCards() {
  const session = await getSession()
  const admin = session?.userId
  if (!admin) return null

  const [rows, venues, waitingVenues, assignments, presets, evaluators, summaries] = await Promise.all([
    getSubmissionsForAdmin(admin),
    getJudgingVenues(admin, "judging"),
    getJudgingVenues(admin, "waiting"),
    getJudgingAssignments(admin),
    getRubricPresets(admin),
    getEvaluators(admin),
    getRoundScoreSummaries(admin),
  ])

  const submitted = rows.filter((r) => r.driveUrl).length
  const unassigned = rows.filter(
    (r) =>
      !resolveJudgingVenue(
        assignments,
        { studentUserId: r.studentUserId, mentorUserId: r.mentorUserId, domainId: r.domainId },
        "judging",
      ).venueId,
  ).length
  const live = presets.find((p) => p.isActive) ?? null
  const liveScored = live ? (summaries.find((s) => s.presetId === live.id)?.scoredCount ?? 0) : 0
  const published = presets.filter((p) => p.scoresPublished).length
  const faculty = evaluators.filter((e) => e.role === "faculty").length
  const jury = evaluators.length - faculty

  const stat: Record<JudgingSlug, string> = {
    submissions: `${submitted} of ${rows.length} teams have submitted`,
    venues:
      `${plural(venues.length, "judging room")}, ${plural(waitingVenues.length, "waiting room")}` +
      (unassigned ? ` · ${plural(unassigned, "team")} without a room` : " · every team placed"),
    documents: "Report settings, the Excel sheet and the faculty, team details and judging PDFs",
    rounds: live
      ? `Live: ${live.name} · ${plural(presets.length, "round")}`
      : `${plural(presets.length, "round")} · none live`,
    evaluators: `${plural(faculty, "faculty member")}, ${plural(jury, "juror")}`,
    scores:
      (live ? `${liveScored} of ${rows.length} scored in ${live.name}` : "No live round") +
      ` · ${plural(published, "round")} on the leaderboard`,
    sheets: live ? `${plural(live.evaluationCount, "sheet")} filed in ${live.name}` : "No live round",
  }

  return (
    <div className="flex flex-col gap-10">
      {JUDGING_GROUPS.map((g) => (
        <section key={g.title} className="flex flex-col gap-4">
          <h2 className="text-primary tracking-[0.2em] uppercase text-xs">{g.title}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {g.sections.map((s) => (
              <DashboardNavCard
                key={s.slug}
                href={`/admin/judging/${s.slug}`}
                icon={ICONS[s.slug]}
                title={s.label}
                description={stat[s.slug]}
                className="p-8"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default function AdminJudgingPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/judging" />

        <JudgingBand />

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          <span className="text-gold-gradient">Judging</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-10">
          Everything for judging in one place: decks and rooms, the round and who marks it, and the
          results.
        </p>

        <Suspense fallback={<TableSkeleton />}>
          <HubCards />
        </Suspense>
      </div>
    </main>
  )
}
