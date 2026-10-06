import { cache } from "react"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSubmissionsForAdmin, getMentorProfilesForAdmin } from "@/lib/admin-directories"
import { getJudgingAssignments, getJudgingVenues, resolveJudgingVenue } from "@/lib/judging"
import { getEvaluators, getRubricPresets } from "@/lib/evaluation"
import { getRoundScoreSummaries, getRoundScores } from "@/lib/round-scores"
import { getDomains } from "@/lib/domains"
import { getDomainCapacities } from "@/lib/domain-capacities"
import { getTimelinePhases, type TimelinePhase } from "@/lib/timeline"
import type { AppUserRow } from "@/components/admin-user-table"

/**
 * Everything the admin home page reads. Each panel streams in on its own, and
 * several need the same lists, so the loaders are wrapped in React `cache()`
 * to hit the database once per request however many panels ask.
 */
export const dashTeams = cache((admin: string) => getSubmissionsForAdmin(admin))
export const dashMentors = cache((admin: string) => getMentorProfilesForAdmin(admin))
export const dashPresets = cache((admin: string) => getRubricPresets(admin))
export const dashEvaluators = cache((admin: string) => getEvaluators(admin))
export const dashSummaries = cache((admin: string) => getRoundScoreSummaries(admin))
export const dashAssignments = cache((admin: string) => getJudgingAssignments(admin))
export const dashVenues = cache((admin: string) => getJudgingVenues(admin, "judging"))
export const dashUsers = cache(async (admin: string): Promise<AppUserRow[]> => {
  const { data } = await getSupabaseServerClient().rpc("admin_list_users", { p_admin_user_id: admin })
  return ((data as AppUserRow[] | null) ?? []).filter((u) => !u.hidden)
})
/** Total students across all teams' rosters. */
export const dashStudentCount = cache(async (admin: string): Promise<number> => {
  const teams = await dashTeams(admin)
  const { data } = await getSupabaseServerClient().rpc("admin_list_team_profiles", { p_admin_user_id: admin })
  const counts = new Map(
    ((data ?? []) as { student_user_id: string; member_count: number | null }[]).map((r) => [
      r.student_user_id,
      Number(r.member_count ?? 0),
    ]),
  )
  return teams.reduce((sum, t) => sum + (counts.get(t.studentUserId) ?? 0), 0)
})

/* ------------------------------------------------------------ programme -- */

export interface ProgrammeStop {
  id: string
  label: string
  title: string
  /** The first date in the entry, when it has one. */
  date: Date | null
  state: "done" | "today" | "upcoming" | "undated"
}

export interface ProgrammeTrack {
  id: string
  title: string
  stops: ProgrammeStop[]
}

/** "21.08.2026 (AN)" or "31.08.2026 & 01.09.2026" → the first date. */
function firstDate(raw: string | undefined): Date | null {
  const m = raw?.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (!m) return null
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
}

/** The wall-clock time at LICET, whatever timezone the server runs in. */
export const istNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/**
 * The timeline as stops on a line, each marked done, today or upcoming from
 * its date. Phase 2 runs weekly without dates, so its stops stay "undated"
 * rather than pretending to know where the programme is.
 */
export function buildProgramme(phases: TimelinePhase[], now = istNow()): ProgrammeTrack[] {
  return phases.map((p) => ({
    id: p.id,
    title: p.title,
    stops: p.entries.map((e) => {
      const date = firstDate(e.date)
      const state: ProgrammeStop["state"] = !date
        ? "undated"
        : sameDay(date, now)
          ? "today"
          : date < now
            ? "done"
            : "upcoming"
      return { id: e.id, label: e.label, title: e.title, date, state }
    }),
  }))
}

export const dashProgramme = cache(async () => buildProgramme(await getTimelinePhases()))

/** Where the programme stands, in one sentence for the top of the page. */
export function programmeStatus(tracks: ProgrammeTrack[]): string {
  const dated = tracks.flatMap((t) => t.stops.map((s) => ({ ...s, track: t.title })))
  const today = dated.find((s) => s.state === "today")
  if (today) return `${today.track}, ${today.label}: ${today.title}.`
  const next = dated.find((s) => s.state === "upcoming")
  const lastDone = [...dated].reverse().find((s) => s.state === "done")
  if (!lastDone && next) return `${next.track} starts with ${next.title} on ${fmtDay(next.date)}.`
  if (next) return `Next on the timeline: ${next.title}, ${fmtDay(next.date)}.`
  // Every dated stop is behind us: we are in the first undated phase after it.
  const after = tracks.find((t) => t.stops.length > 0 && t.stops.every((s) => s.state === "undated"))
  if (after && lastDone) return `${lastDone.track} wrapped up on ${fmtDay(lastDone.date)}. ${after.title} is under way.`
  return "The programme timeline has no dates yet."
}

export const fmtDay = (d: Date | null) =>
  d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long" }) : ""

/* --------------------------------------------------------- needs you -- */

export interface AttentionItem {
  id: string
  count: number
  /** What is missing, written so it reads after the count. */
  text: string
  href: string
  action: string
  /** Blocks judging or the programme, rather than a loose end. */
  urgent?: boolean
}

/** Open loose ends, worst first. Items at zero are left out. */
export const dashAttention = cache(async (admin: string): Promise<AttentionItem[]> => {
  const [teams, mentors, presets, users, assignments] = await Promise.all([
    dashTeams(admin),
    dashMentors(admin),
    dashPresets(admin),
    dashUsers(admin),
    dashAssignments(admin),
  ])
  const live = presets.find((p) => p.isActive) ?? null
  const liveScores = live ? await getRoundScores(admin, live.id) : {}

  const unscored = live ? teams.filter((t) => !liveScores[t.studentUserId]).length : 0
  const noRoom = teams.filter(
    (t) =>
      !resolveJudgingVenue(
        assignments,
        { studentUserId: t.studentUserId, mentorUserId: t.mentorUserId, domainId: t.domainId },
        "judging",
      ).venueId,
  ).length
  const noDeck = teams.filter((t) => !t.driveUrl && !t.canvaUrl).length
  const noMentor = teams.filter((t) => !t.mentorUserId).length
  const noTheme = teams.filter((t) => !t.domainId).length
  const noTitle = teams.filter((t) => !t.projectTitle?.trim()).length
  const noEmail = users.filter((u) => u.role === "member" && !u.email).length
  const starting = users.filter((u) => (u.role === "member" || u.role === "mentor") && u.must_change_password).length
  const bareMentors = mentors.filter((m) => !m.bio?.trim() || !m.avatarUrl).length

  const items: AttentionItem[] = [
    live && {
      id: "unscored",
      count: unscored,
      text: `${unscored === 1 ? "team has" : "teams have"} no score in ${live.name}`,
      href: `/admin/judging/scores?round=${live.id}`,
      action: "Enter scores",
      urgent: true,
    },
    {
      id: "no-room",
      count: noRoom,
      text: `${noRoom === 1 ? "team has" : "teams have"} no judging room`,
      href: "/admin/judging/venues",
      action: "Assign rooms",
      urgent: true,
    },
    {
      id: "no-deck",
      count: noDeck,
      text: `${noDeck === 1 ? "team hasn't" : "teams haven't"} submitted a deck`,
      href: "/admin/judging/submissions",
      action: "See submissions",
      urgent: true,
    },
    {
      id: "no-mentor",
      count: noMentor,
      text: `${noMentor === 1 ? "team has" : "teams have"} no mentor`,
      href: "/admin/matching",
      action: "Allocate mentors",
    },
    {
      id: "no-theme",
      count: noTheme,
      text: `${noTheme === 1 ? "team hasn't" : "teams haven't"} picked a theme`,
      href: "/admin/students",
      action: "Open selections",
    },
    {
      id: "no-title",
      count: noTitle,
      text: `${noTitle === 1 ? "team has" : "teams have"} no project title`,
      href: "/admin/team-profiles",
      action: "View teams",
    },
    {
      id: "starting-password",
      count: starting,
      text: `team or mentor ${starting === 1 ? "account hasn't" : "accounts haven't"} changed the starting password`,
      href: "/admin/users",
      action: "View users",
    },
    {
      id: "no-email",
      count: noEmail,
      text: `${noEmail === 1 ? "team hasn't" : "teams haven't"} added a contact email`,
      href: "/admin/users",
      action: "View users",
    },
    {
      id: "bare-mentors",
      count: bareMentors,
      text: `${bareMentors === 1 ? "mentor is" : "mentors are"} missing a photo or bio`,
      href: "/admin/mentor-profiles",
      action: "View mentors",
    },
  ].filter((i): i is AttentionItem => Boolean(i) && (i as AttentionItem).count > 0)

  return items.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent))
})

/* ------------------------------------------------------------ themes -- */

export interface ThemeLoad {
  id: string
  title: string
  teams: number
  teamCap: number
  mentors: number
  mentorCap: number
}

export const dashThemes = cache(async (admin: string): Promise<ThemeLoad[]> => {
  const [domains, caps, teams, mentors] = await Promise.all([
    getDomains(),
    getDomainCapacities(),
    dashTeams(admin),
    dashMentors(admin),
  ])
  const cap = new Map(caps.map((c) => [c.domain_id, c]))
  return domains.map((d) => ({
    id: d.id,
    title: d.title,
    teams: teams.filter((t) => t.domainId === d.id).length,
    teamCap: cap.get(d.id)?.student_capacity ?? 0,
    mentors: mentors.filter((m) => m.domainIds.includes(d.id)).length,
    mentorCap: cap.get(d.id)?.mentor_capacity ?? 0,
  }))
})
