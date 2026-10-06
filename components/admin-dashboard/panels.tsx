import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowUpRight, CircleCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSession } from "@/lib/get-session"
import { getAppSettings } from "@/lib/app-settings"
import { getLeaderboard } from "@/lib/leaderboard"
import { AdminSettingToggle } from "@/components/admin-setting-toggle"
import { LiveRoundBar } from "@/components/judging/live-round-bar"
import {
  dashAttention,
  dashEvaluators,
  dashMentors,
  dashPresets,
  dashProgramme,
  dashStudentCount,
  dashSummaries,
  dashTeams,
  dashThemes,
  fmtDay,
  istNow,
  programmeStatus,
  type ProgrammeStop,
} from "@/lib/admin-dashboard"

/* --------------------------------------------------------------- frame -- */

/** A dashboard panel. `strong` lifts the one panel that asks for action. */
export function Panel({
  title,
  aside,
  strong,
  className,
  children,
}: {
  title: string
  aside?: ReactNode
  strong?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card/40 backdrop-blur-sm p-5 sm:p-6 flex flex-col gap-4 min-w-0",
        strong ? "border-primary/50" : "border-border",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl text-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function PanelSkeleton({ title, rows = 4, className }: { title: string; rows?: number; className?: string }) {
  return (
    <Panel title={title} className={className}>
      <div className="flex flex-col gap-3" aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-5 rounded bg-border/40 animate-pulse" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </Panel>
  )
}

const PanelLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
    {children}
    <ArrowUpRight className="w-3.5 h-3.5" />
  </Link>
)

async function adminId() {
  const session = await getSession()
  return session?.userId ?? null
}

/* ---------------------------------------------------------------- hero -- */

/**
 * The top of the page: today's date, where the programme stands in a
 * sentence, and the programme itself as a line of stops with today marked.
 */
export async function Hero() {
  const admin = await adminId()
  const [tracks, presets, summaries, teams] = await Promise.all([
    dashProgramme(),
    admin ? dashPresets(admin) : [],
    admin ? dashSummaries(admin) : [],
    admin ? dashTeams(admin) : [],
  ])
  const live = presets.find((p) => p.isActive) ?? null
  const scored = live ? (summaries.find((s) => s.presetId === live.id)?.scoredCount ?? 0) : 0
  const today = istNow().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })

  return (
    <header className="mb-12">
      <p className="text-muted-foreground text-base mb-3">{today}</p>
      <h1 className="font-serif text-4xl md:text-[3.25rem] text-foreground leading-[1.1] max-w-4xl text-balance">
        {/* One sentence per line, so the status reads as two clear beats. */}
        {programmeStatus(tracks)
          .split(/(?<=\.)\s+/)
          .map((sentence, i) => (
            <span key={i} className="block">
              {sentence}
            </span>
          ))}
      </h1>
      <p className="text-lg text-muted-foreground mt-5 max-w-3xl">
        {live ? (
          <>
            <span className="text-foreground">{live.name}</span> is the live round, with {scored} of{" "}
            {teams.length} teams scored so far.
          </>
        ) : (
          "No judging round is live. Pick one under Judging when you're ready to mark."
        )}
      </p>

      <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,9fr)_minmax(0,12fr)]">
        {tracks.map((t) => (
          <ProgrammeLine key={t.id} title={t.title} stops={t.stops} />
        ))}
      </div>
    </header>
  )
}

/**
 * One phase as a gold rule with a diamond per session. Filled diamonds are
 * behind us, the ringed one is today, hollow ones are still to come. Weekly
 * sessions without dates are drawn on a dashed rule, in order.
 */
function ProgrammeLine({ title, stops }: { title: string; stops: ProgrammeStop[] }) {
  const done = stops.filter((s) => s.state === "done").length
  const dated = stops.some((s) => s.date)
  const first = stops.find((s) => s.date)?.date ?? null
  const last = [...stops].reverse().find((s) => s.date)?.date ?? null
  const caption = !dated
    ? `${stops.length} weekly sessions`
    : done === stops.length
      ? `Finished ${fmtDay(last)}`
      : `${fmtDay(first)} – ${fmtDay(last)}`

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-serif text-xl text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{caption}</p>
      </div>
      <ol className="relative flex items-center justify-between h-6" aria-label={`${title} sessions`}>
        <span
          className={cn(
            "absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t",
            dated ? "border-primary/40" : "border-dashed border-primary/30",
          )}
          aria-hidden
        />
        {dated && done > 0 && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 border-t-2 border-primary"
            style={{ width: `${(Math.max(done - 1, 0) / Math.max(stops.length - 1, 1)) * 100}%` }}
            aria-hidden
          />
        )}
        {stops.map((s) => (
          <li key={s.id} className="relative z-10 flex" title={`${s.label}: ${s.title}${s.date ? ` (${fmtDay(s.date)})` : ""}`}>
            <span className="sr-only">
              {s.label}, {s.title}, {s.state === "done" ? "done" : s.state === "today" ? "today" : "to come"}
            </span>
            <span
              aria-hidden
              className={cn(
                "block rotate-45 bg-background",
                s.state === "today"
                  ? "w-3.5 h-3.5 bg-primary ring-4 ring-primary/25"
                  : s.state === "done"
                    ? "w-2.5 h-2.5 bg-primary"
                    : "w-2.5 h-2.5 border border-primary/60",
              )}
            />
          </li>
        ))}
      </ol>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>{stops[0]?.label}</span>
        <span>{stops[stops.length - 1]?.label}</span>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- needs you -- */

export async function NeedsYou() {
  const admin = await adminId()
  const items = admin ? await dashAttention(admin) : []

  return (
    <Panel title="Needs you" strong className="lg:col-span-7">
      {items.length === 0 ? (
        <p className="flex items-center gap-3 text-foreground py-6">
          <CircleCheck className="w-5 h-5 text-primary" />
          Nothing is waiting on you. Every team is placed, mentored and scored.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border -my-2">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                href={i.href}
                className="group flex items-center gap-4 py-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  className={cn(
                    "font-serif text-3xl tabular-nums w-14 shrink-0 text-right leading-none",
                    i.urgent ? "text-primary" : "text-foreground",
                  )}
                >
                  {i.count}
                </span>
                <span className="flex-1 min-w-0 text-foreground">{i.text}</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground group-hover:text-primary whitespace-nowrap">
                  {i.action}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* -------------------------------------------------------------- people -- */

export async function People() {
  const admin = await adminId()
  if (!admin) return null
  const [teams, mentors, evaluators, students] = await Promise.all([
    dashTeams(admin),
    dashMentors(admin),
    dashEvaluators(admin),
    dashStudentCount(admin),
  ])
  const guiding = new Set(teams.map((t) => t.mentorUserId).filter(Boolean)).size
  const faculty = evaluators.filter((e) => e.role === "faculty").length

  const rows: { label: string; value: number; note: string; href: string }[] = [
    { label: "Teams", value: teams.length, note: `${students} students`, href: "/admin/team-profiles" },
    { label: "Mentors", value: mentors.length, note: `${guiding} guiding a team`, href: "/admin/mentor-profiles" },
    {
      label: "Evaluators",
      value: evaluators.length,
      note: `${faculty} faculty, ${evaluators.length - faculty} jury`,
      href: "/admin/judging/evaluators",
    },
  ]

  return (
    <Panel title="People">
      <dl className="flex flex-col divide-y divide-border -my-2">
        {rows.map((r) => (
          <Link key={r.label} href={r.href} className="group flex items-baseline gap-4 py-3">
            <dt className="flex-1 text-foreground group-hover:text-primary">{r.label}</dt>
            <dd className="text-sm text-muted-foreground">{r.note}</dd>
            <dd className="font-serif text-3xl tabular-nums text-foreground w-14 text-right leading-none">{r.value}</dd>
          </Link>
        ))}
      </dl>
    </Panel>
  )
}

/* ---------------------------------------------------------- live round -- */

export function LiveRound() {
  return (
    <section className="rounded-xl border border-primary/30 bg-card/40 backdrop-blur-sm px-5 sm:px-6 py-5 lg:col-span-12">
      <LiveRoundBar />
    </section>
  )
}

/* --------------------------------------------------------- leaderboard -- */

export async function Leaderboard() {
  const admin = await adminId()
  if (!admin) return null
  const { rounds, entries } = await getLeaderboard(admin)
  const top = entries.slice(0, 5)
  const max = rounds.length ? rounds.reduce((s, r) => s + r.max, 0) / rounds.length : 0

  return (
    <Panel
      title="Leaderboard"
      className="lg:col-span-5"
      aside={rounds.length > 0 ? <PanelLink href="/admin/judging/scores">Scores</PanelLink> : undefined}
    >
      {rounds.length === 0 ? (
        <p className="text-muted-foreground">
          No round is on the leaderboard yet.{" "}
          <Link href="/admin/judging/scores" className="text-primary hover:underline">
            Publish one from Scores
          </Link>{" "}
          when the marks are in.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground -mt-2">
            {rounds.length === 1 ? rounds[0].name : `Average of ${rounds.map((r) => r.name).join(" and ")}`}, as teams
            and mentors see it.
          </p>
          <ol className="flex flex-col divide-y divide-border">
            {top.map((e) => (
              <li key={e.studentUserId} className="flex items-center gap-4 py-2.5">
                <span
                  className={cn(
                    "font-serif text-2xl w-7 text-right tabular-nums leading-none",
                    e.rank === 1 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {e.rank}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-foreground truncate">{e.teamName}</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    Team {e.loginId}
                    {e.mentorName ? `, mentored by ${e.mentorName}` : ""}
                  </span>
                </span>
                <span className="tabular-nums text-foreground">
                  {e.overall}
                  <span className="text-muted-foreground text-sm">/{Math.round(max)}</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Panel>
  )
}

/* -------------------------------------------------------------- themes -- */

function Meter({ value, cap, label }: { value: number; cap: number; label: string }) {
  const over = cap > 0 && value > cap
  const pct = cap > 0 ? Math.min(100, (value / cap) * 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-0" title={`${label}: ${value} of ${cap || "no limit"}`}>
      <span className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
        <span className={cn("block h-full", over ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
      </span>
      <span className={cn("text-xs tabular-nums w-10 text-right", over ? "text-destructive" : "text-muted-foreground")}>
        {value}/{cap}
      </span>
    </div>
  )
}

export async function Themes() {
  const admin = await adminId()
  if (!admin) return null
  const themes = await dashThemes(admin)

  return (
    <Panel title="Themes" className="lg:col-span-7" aside={<PanelLink href="/admin/domains">Edit themes</PanelLink>}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_minmax(0,7rem)] gap-x-4 text-xs text-muted-foreground -mb-1">
        <span />
        <span>Teams</span>
        <span>Mentors</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {themes.map((t) => (
          <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_minmax(0,7rem)] gap-x-4 items-center">
            <span className="text-sm text-foreground truncate" title={t.title}>
              {t.title}
            </span>
            <Meter value={t.teams} cap={t.teamCap} label="Teams" />
            <Meter value={t.mentors} cap={t.mentorCap} label="Mentors" />
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/* ------------------------------------------------------------ switches -- */

export async function Switches() {
  const s = await getAppSettings()
  return (
    <Panel title="Portal switches" className="lg:col-span-12">
      <p className="text-sm text-muted-foreground -mt-2">What teams and mentors can do right now.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 [&>div]:sm:max-w-none">
        <AdminSettingToggle
          role="member"
          field="view"
          title="Teams see the themes"
          initialEnabled={s.studentDomainSelectionOpen}
          activeDescription="The theme page is open to teams."
          inactiveDescription="Teams see the timeline instead."
        />
        <AdminSettingToggle
          role="member"
          field="select"
          title="Teams pick a theme"
          initialEnabled={s.studentCanSelect}
          activeDescription="Teams can choose their theme."
          inactiveDescription="Teams can look but not choose."
        />
        <AdminSettingToggle
          role="mentor"
          field="view"
          title="Mentors see the themes"
          initialEnabled={s.mentorDomainSelectionOpen}
          activeDescription="The theme page is open to mentors."
          inactiveDescription="Mentors see the timeline instead."
        />
        <AdminSettingToggle
          role="mentor"
          field="select"
          title="Mentors pick themes"
          initialEnabled={s.mentorCanSelect}
          activeDescription="Mentors can choose their themes."
          inactiveDescription="Mentors can look but not choose."
        />
        <AdminSettingToggle
          field="teamNameEdit"
          title="Teams rename themselves"
          initialEnabled={s.teamNameEditOpen}
          activeDescription="Teams can change their name."
          inactiveDescription="Team names are locked."
        />
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------ activity -- */

function ago(iso: string, now: number) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? "yesterday" : `${days} days ago`
}

export async function RecentDecks() {
  const admin = await adminId()
  if (!admin) return null
  const teams = await dashTeams(admin)
  const recent = teams
    .filter((t) => t.updatedAt && (t.driveUrl || t.canvaUrl))
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 4)
  const now = Date.now()

  return (
    <Panel
      title="Latest decks"
      aside={<PanelLink href="/admin/judging/submissions">All submissions</PanelLink>}
    >
      {recent.length === 0 ? (
        <p className="text-muted-foreground">No team has submitted a deck yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border -my-2">
          {recent.map((t) => (
            <li key={t.studentUserId} className="flex items-baseline gap-3 py-2.5">
              <span className="flex-1 min-w-0 truncate text-foreground">
                {t.teamName?.trim() || `Team ${t.loginId}`}
                <span className="text-muted-foreground text-sm"> · Team {t.loginId}</span>
              </span>
              <span className="text-sm text-muted-foreground whitespace-nowrap">{ago(t.updatedAt!, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
