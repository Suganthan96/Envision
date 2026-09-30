import Link from "next/link"
import { ArrowUpRight, Crown, Medal, Trophy, UserCircle } from "lucide-react"
import { ArtDecoDivider } from "@/components/art-deco-divider"
import { PortalHeader } from "@/components/portal-header"
import { getSession } from "@/lib/get-session"
import { getDomains } from "@/lib/domains"
import { getLeaderboard, type LeaderboardEntry, type LeaderboardRound } from "@/lib/leaderboard"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""))

/** Clicking a team opens its project profile, with a way back here. */
const profileHref = (loginId: string) => `/showcase/${encodeURIComponent(loginId)}?from=leaderboard`

export default async function MemberLeaderboardPage() {
  const session = await getSession()
  const [{ rounds, entries }, domains] = await Promise.all([
    session ? getLeaderboard(session.userId) : Promise.resolve({ rounds: [], entries: [] }),
    getDomains(),
  ])
  const domainTitle = (id: string | null) => (id ? (domains.find((d) => d.id === id)?.title ?? null) : null)

  const averaged = rounds.length > 1
  // What the headline score is out of: the round's marks, or the mean of them
  // when the headline is an average.
  const overallMax = rounds.length === 0 ? 0 : rounds.reduce((s, r) => s + r.max, 0) / rounds.length
  const mine = entries.find((e) => e.studentUserId === session?.userId) ?? null
  const podium = entries.filter((e) => e.rank <= 3).slice(0, 3)
  const rest = entries.slice(podium.length)

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <PortalHeader maxWidth="max-w-4xl" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <Link
          href="/member"
          className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider mb-8 inline-block"
        >
          ← Back to Portal
        </Link>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">EnVision 2026</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          <span className="text-gold-gradient">Leaderboard</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-4">
          {rounds.length === 0
            ? "Scores will appear here once the organisers publish them."
            : averaged
              ? `Ranked by the average of ${rounds.map((r) => r.name).join(", ")}. Tap a team to see its project.`
              : `Scores from ${rounds[0].name}. Tap a team to see its project.`}
        </p>

        <ArtDecoDivider variant="stepped" />

        {rounds.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-4 border border-border rounded-2xl bg-card/40 px-6 py-16">
            <Trophy className="w-10 h-10 text-primary/50" />
            <p className="text-muted-foreground">Nothing to show yet — check back after judging.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {mine && (
              <Link
                href={profileHref(mine.loginId)}
                className="group flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-primary bg-primary/10 px-6 py-5 hover:bg-primary/15 transition-colors"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-primary tracking-[0.1em] uppercase text-[10px]">Your rank</span>
                  <span className="font-serif text-4xl text-primary tabular-nums">#{mine.rank}</span>
                  <span className="text-muted-foreground text-sm">of {entries.length}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-primary tracking-[0.1em] uppercase text-[10px]">
                    {averaged ? "Average" : "Score"}
                  </span>
                  <span className="font-serif text-3xl text-foreground tabular-nums">{fmt(mine.overall)}</span>
                  <span className="text-muted-foreground text-sm">/ {fmt(overallMax)}</span>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 text-primary text-xs uppercase tracking-[0.1em]">
                  Your project <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            )}

            {podium.length > 0 && (
              <section className="grid gap-5 md:grid-cols-3 md:items-end">
                {/* 2nd · 1st · 3rd on wide screens so the winner stands in the middle */}
                {[podium[1], podium[0], podium[2]].map((e, i) =>
                  e ? (
                    <PodiumCard
                      key={e.studentUserId}
                      entry={e}
                      rounds={rounds}
                      averaged={averaged}
                      overallMax={overallMax}
                      domain={domainTitle(e.domainId)}
                      isMine={e.studentUserId === session?.userId}
                      className={cn(i === 1 ? "md:order-2 order-1" : i === 0 ? "md:order-1 order-2" : "order-3")}
                    />
                  ) : null,
                )}
              </section>
            )}

            {rest.length > 0 && (
              <section className="flex flex-col gap-3">
                {rest.map((e) => (
                  <TeamRow
                    key={e.studentUserId}
                    entry={e}
                    rounds={rounds}
                    averaged={averaged}
                    overallMax={overallMax}
                    domain={domainTitle(e.domainId)}
                    isMine={e.studentUserId === session?.userId}
                  />
                ))}
              </section>
            )}

            {averaged && (
              <p className="text-muted-foreground text-xs -mt-6">
                A round a team has no score in counts as 0 toward its average.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function TeamLogo({ entry, size }: { entry: LeaderboardEntry; size: "sm" | "lg" }) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/15 via-card to-card flex items-center justify-center",
        size === "lg" ? "size-20" : "size-12",
      )}
    >
      {entry.teamLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.teamLogoUrl} alt={`${entry.teamName} logo`} className="w-full h-full object-cover" />
      ) : (
        <span className={cn("font-serif text-primary", size === "lg" ? "text-3xl" : "text-lg")}>
          {entry.teamName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

function Meta({ entry, domain, center }: { entry: LeaderboardEntry; domain: string | null; center?: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs", center && "justify-center")}>
      {entry.mentorName && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <UserCircle className="w-3.5 h-3.5 text-primary/70" />
          {entry.mentorName}
        </span>
      )}
      {domain && (
        <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 px-2 py-0.5 rounded-full">
          {domain}
        </span>
      )}
    </div>
  )
}

function RoundScores({
  entry,
  rounds,
  center,
}: {
  entry: LeaderboardEntry
  rounds: LeaderboardRound[]
  center?: boolean
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", center && "justify-center")}>
      {rounds.map((r) => (
        <span
          key={r.id}
          className="inline-flex items-baseline gap-1.5 rounded-md border border-border bg-background/40 px-2 py-1 text-xs"
          title={r.name}
        >
          <span className="text-muted-foreground max-w-[9rem] truncate">{r.name}</span>
          <span className="text-foreground tabular-nums">
            {entry.scores[r.id] == null ? "—" : fmt(entry.scores[r.id])}
          </span>
        </span>
      ))}
    </div>
  )
}

const PODIUM_STYLE = {
  1: { icon: Crown, ring: "border-primary shadow-[0_0_40px_-12px_var(--primary)]", pad: "md:pb-10 md:pt-8" },
  2: { icon: Medal, ring: "border-border", pad: "" },
  3: { icon: Medal, ring: "border-border", pad: "" },
} as const

function PodiumCard({
  entry,
  rounds,
  averaged,
  overallMax,
  domain,
  isMine,
  className,
}: {
  entry: LeaderboardEntry
  rounds: LeaderboardRound[]
  averaged: boolean
  overallMax: number
  domain: string | null
  isMine: boolean
  className?: string
}) {
  const style = PODIUM_STYLE[Math.min(entry.rank, 3) as 1 | 2 | 3]
  const Icon = style.icon
  return (
    <Link
      href={profileHref(entry.loginId)}
      className={cn(
        "group relative flex flex-col items-center text-center gap-3 rounded-2xl border bg-card/60 backdrop-blur-md p-6",
        "hover:border-primary hover:-translate-y-1 transition-all duration-300",
        style.ring,
        style.pad,
        isMine && "bg-primary/10",
        className,
      )}
    >
      <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="inline-flex items-center gap-1.5 text-primary text-xs uppercase tracking-[0.15em]">
        <Icon className="w-4 h-4" /> #{entry.rank}
      </span>
      <TeamLogo entry={entry} size="lg" />
      <div className="min-w-0 w-full">
        <h3 className="font-serif text-xl text-foreground group-hover:text-primary transition-colors truncate">
          {entry.teamName}
        </h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mt-0.5">
          {entry.projectTitle ?? "Project title not added yet"}
        </p>
      </div>
      <Meta entry={entry} domain={domain} center />
      <p className="mt-1">
        <span className="font-serif text-4xl text-gold-gradient tabular-nums">{fmt(entry.overall)}</span>
        <span className="text-muted-foreground text-sm"> / {fmt(overallMax)}</span>
      </p>
      {averaged && <RoundScores entry={entry} rounds={rounds} center />}
    </Link>
  )
}

function TeamRow({
  entry,
  rounds,
  averaged,
  overallMax,
  domain,
  isMine,
}: {
  entry: LeaderboardEntry
  rounds: LeaderboardRound[]
  averaged: boolean
  overallMax: number
  domain: string | null
  isMine: boolean
}) {
  const pct = overallMax > 0 ? Math.min(100, (entry.overall / overallMax) * 100) : 0
  return (
    <Link
      href={profileHref(entry.loginId)}
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-border bg-card/40 px-4 py-4",
        "hover:border-primary/70 hover:bg-card/70 transition-colors",
        isMine && "border-primary bg-primary/10",
      )}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <span className="w-8 text-center font-serif text-xl text-muted-foreground tabular-nums shrink-0">
          {entry.rank}
        </span>
        <TeamLogo entry={entry} size="sm" />
        <div className="min-w-0 flex flex-col gap-1">
          <p className="truncate">
            <span
              className={cn("text-foreground group-hover:text-primary transition-colors", isMine && "text-primary")}
            >
              {entry.teamName}
            </span>
            <span className="text-muted-foreground font-mono text-xs ml-2">#{entry.loginId}</span>
          </p>
          <p className="text-muted-foreground text-sm truncate">
            {entry.projectTitle ?? "Project title not added yet"}
          </p>
          <Meta entry={entry} domain={domain} />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:items-end sm:w-56 shrink-0 pl-12 sm:pl-0">
        <p className="flex items-baseline gap-1">
          <span className="font-serif text-2xl text-foreground tabular-nums">{fmt(entry.overall)}</span>
          <span className="text-muted-foreground text-xs">/ {fmt(overallMax)}</span>
          {averaged && <span className="text-primary tracking-[0.1em] uppercase text-[10px] ml-1">avg</span>}
        </p>
        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        {averaged && <RoundScores entry={entry} rounds={rounds} />}
      </div>
    </Link>
  )
}
