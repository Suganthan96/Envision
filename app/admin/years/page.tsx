import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { StartYearForm, YearsList, type YearRow } from "@/components/years-manager"
import { getSession } from "@/lib/get-session"
import { getEditions, getRequestEdition } from "@/lib/edition"
import { getBaseSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

/**
 * Programme years: every year kept side by side, which one is current, and
 * starting the next one. Nothing here ever deletes a year's data.
 */
export default async function AdminYearsPage() {
  const session = await getSession()
  const [years, editing] = await Promise.all([getEditions(), getRequestEdition()])

  const { data, error } = session
    ? await getBaseSupabaseClient().rpc("admin_edition_stats", { p_admin_user_id: session.userId })
    : { data: null, error: null }
  const stats = new Map(
    ((data ?? []) as {
      edition_id: string
      teams: number
      mentors: number
      evaluators: number
      rounds: number
      scored: number
      submitted: number
    }[]).map((r) => [
      r.edition_id,
      {
        teams: Number(r.teams),
        mentors: Number(r.mentors),
        evaluators: Number(r.evaluators),
        rounds: Number(r.rounds),
        scored: Number(r.scored),
        submitted: Number(r.submitted),
      },
    ]),
  )
  // The year tools live in one database update (supabase/editions.sql, part 2).
  const toolsReady = !error

  const rows: YearRow[] = years.map((y) => ({
    id: y.id,
    label: y.label,
    isCurrent: y.isCurrent,
    stats: stats.get(y.id) ?? null,
  }))

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-5xl mx-auto">
        <AdminHeader />

        <AdminNav active="/admin/years" />

        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">Programme years</h1>
        <p className="text-muted-foreground text-lg mb-10 max-w-3xl">
          Each year keeps its own teams, projects, mentors, rounds, scores, rooms, timeline and guidelines. Starting a
          new year never changes or removes an earlier one, and you can open any year to view or edit it.
        </p>

        {!toolsReady && (
          <p className="mb-8 rounded-lg border border-destructive/60 px-4 py-3 text-sm text-foreground">
            Starting a year and switching the current year need one more database update that hasn&apos;t been
            applied yet (part 2 of supabase/editions.sql). Viewing and editing each year already works.
          </p>
        )}

        <YearsList years={rows} editing={editing.id} />

        <section className="mt-12 rounded-xl border border-border bg-card/40 backdrop-blur-sm p-5 sm:p-6">
          <h2 className="font-serif text-3xl text-foreground mb-1">Start a new year</h2>
          <p className="text-muted-foreground mb-6">
            Sets up a fresh year with its own logins. Earlier years stay exactly as they are.
          </p>
          <StartYearForm years={rows} />
        </section>
      </div>
    </main>
  )
}
