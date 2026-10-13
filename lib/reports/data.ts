import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getMentorProfilesForAdmin, getTeamProfilesForAdmin } from "@/lib/admin-directories"
import { getTeamMembers } from "@/lib/team-members"
import { getEvaluations, getEvaluators, getRubricPresets } from "@/lib/evaluation"
import { getRoundScores } from "@/lib/round-scores"
import { getJudgingAssignments, getJudgingVenues, resolveJudgingVenue } from "@/lib/judging"
import { getDomains } from "@/lib/domains"
import { getDomainCapacities } from "@/lib/domain-capacities"
import { getTimelinePhases } from "@/lib/timeline"
import { getAppSettings } from "@/lib/app-settings"
import { getRequestEdition } from "@/lib/edition"
import type { ReportData } from "@/lib/reports/types"

interface UserRow {
  login_id: string
  role: string
  name: string | null
  phone: string | null
  email: string | null
  hidden?: boolean
  must_change_password: boolean
}

/**
 * Gathers one programme year's records for the reports: every team with its
 * roster, project, mentor and rooms; mentors, evaluators and accounts; themes
 * and capacities; every round with its scores and evaluator sheets; rooms,
 * timeline and settings. Uses the same admin RPCs as the admin pages, so it
 * follows the year the admin is working in. Passwords are never included.
 */
export async function buildReportData(adminId: string): Promise<ReportData> {
  const supabase = getSupabaseServerClient()
  const [
    edition,
    profiles,
    mentors,
    evaluators,
    users,
    domains,
    capacities,
    presets,
    judgingRooms,
    waitingRooms,
    assignments,
    venues,
    phases,
    settings,
  ] = await Promise.all([
    getRequestEdition(),
    getTeamProfilesForAdmin(adminId),
    getMentorProfilesForAdmin(adminId),
    getEvaluators(adminId),
    supabase.rpc("admin_list_users", { p_admin_user_id: adminId }).then((r) => (r.data ?? []) as UserRow[]),
    getDomains(),
    getDomainCapacities(),
    getRubricPresets(adminId),
    getJudgingVenues(adminId, "judging"),
    getJudgingVenues(adminId, "waiting"),
    getJudgingAssignments(adminId),
    supabase.rpc("get_venues").then((r) => (r.data ?? []) as { code: string; team_capacity: number }[]),
    getTimelinePhases(),
    getAppSettings(),
  ])

  const userByLogin = new Map(users.map((u) => [u.login_id, u]))
  const hiddenLogins = new Set(users.filter((u) => u.hidden).map((u) => u.login_id))
  const domainTitle = new Map(domains.map((d) => [d.id, d.title]))
  const roomName = new Map([...judgingRooms, ...waitingRooms].map((v) => [v.id, v.name]))
  const teamsVisible = profiles.filter((t) => !hiddenLogins.has(t.loginId))

  const [members, rounds] = await Promise.all([
    Promise.all(teamsVisible.map((t) => getTeamMembers(t.studentUserId))),
    Promise.all(
      presets.map(async (p) => {
        const [marks, sheets] = await Promise.all([getRoundScores(adminId, p.id), getEvaluations(adminId, p.id)])
        return {
          id: p.id,
          name: p.name,
          criteria: p.rubric.map((r) => ({ label: r.label, max: Number(r.max) || 0 })),
          max: p.rubric.reduce((s, r) => s + (Number(r.max) || 0), 0),
          live: p.isActive,
          published: p.scoresPublished,
          tiebreak: p.tiebreak,
          marks,
          sheets: sheets.map((s) => ({
            studentUserId: s.studentUserId,
            evaluatorLoginId: s.evaluatorLoginId,
            evaluatorName: s.evaluatorName,
            evaluatorRole: s.evaluatorRole,
            marks: s.marks,
            total: s.total,
            updatedAt: s.updatedAt,
          })),
        }
      }),
    ),
  ])

  const teamByUserId = new Map(teamsVisible.map((t) => [t.studentUserId, t]))
  const capByDomain = new Map(capacities.map((c) => [c.domain_id, c]))

  return {
    year: { id: edition.id, label: edition.label, isCurrent: edition.isCurrent },
    generatedAt: new Date().toISOString(),
    teams: teamsVisible.map((t, i) => {
      const u = userByLogin.get(t.loginId)
      const place = { studentUserId: t.studentUserId, mentorUserId: t.mentorUserId, domainId: t.domainId }
      const judging = resolveJudgingVenue(assignments, place, "judging").venueId
      const waiting = resolveJudgingVenue(assignments, place, "waiting").venueId
      return {
        studentUserId: t.studentUserId,
        loginId: t.loginId,
        teamName: t.teamName?.trim() || `Team ${t.loginId}`,
        teamLeadName: t.teamLeadName,
        email: u?.email ?? null,
        phone: u?.phone ?? null,
        logoUrl: t.teamLogoUrl,
        domainId: t.domainId,
        domainTitle: t.domainId ? (domainTitle.get(t.domainId) ?? t.domainId) : null,
        mentorUserId: t.mentorUserId,
        mentorLoginId: t.mentorLoginId,
        mentorName: t.mentorName,
        labVenue: t.venue,
        judgingVenue: judging ? (roomName.get(judging) ?? null) : null,
        waitingVenue: waiting ? (roomName.get(waiting) ?? null) : null,
        projectTitle: t.projectTitle,
        problemStatement: t.problemStatement,
        solutionShort: t.solutionShort,
        solutionLong: t.solutionLong,
        driveUrl: t.submissionDriveUrl,
        canvaUrl: t.submissionCanvaUrl,
        submittedAt: t.submissionUpdatedAt,
        members: members[i].map((m) => ({ name: m.name, email: m.email, department: m.department })),
        mustChangePassword: Boolean(u?.must_change_password),
      }
    }),
    mentors: mentors
      .filter((m) => !hiddenLogins.has(m.loginId))
      .map((m) => {
        const u = userByLogin.get(m.loginId)
        return {
          userId: m.mentorUserId,
          loginId: m.loginId,
          name: m.name,
          phone: u?.phone ?? null,
          email: u?.email ?? null,
          hasPhoto: Boolean(m.avatarUrl),
          hasBio: Boolean(m.bio?.trim()),
          domainIds: m.domainIds,
          labVenue: m.venue,
          teamLoginIds: teamsVisible.filter((t) => t.mentorUserId === m.mentorUserId).map((t) => t.loginId),
          mustChangePassword: Boolean(u?.must_change_password),
        }
      }),
    evaluators: evaluators.map((e) => ({
      userId: e.userId,
      loginId: e.loginId,
      name: e.name,
      role: e.role,
      rooms: e.venueIds.map((id) => roomName.get(id) ?? id),
      extraTeamLoginIds: e.teamIds.map((id) => teamByUserId.get(id)?.loginId ?? id),
    })),
    accounts: users.map((u) => ({
      loginId: u.login_id,
      role: u.role,
      name: u.name,
      phone: u.phone,
      email: u.email,
      hidden: Boolean(u.hidden),
      mustChangePassword: Boolean(u.must_change_password),
    })),
    domains: domains.map((d) => ({
      id: d.id,
      title: d.title,
      sdgs: d.sdgs ?? [],
      teamCapacity: capByDomain.get(d.id)?.student_capacity ?? 0,
      mentorCapacity: capByDomain.get(d.id)?.mentor_capacity ?? 0,
    })),
    rounds,
    judgingRooms: judgingRooms.map((v) => v.name),
    waitingRooms: waitingRooms.map((v) => v.name),
    labVenues: venues.map((v) => ({ code: v.code, capacity: Number(v.team_capacity ?? 0) })),
    timeline: phases.flatMap((p) =>
      p.entries.map((e) => ({
        phase: p.title,
        label: e.label,
        date: e.date ?? null,
        title: e.title,
        venue: e.venue ?? null,
        resource: e.resource ?? null,
      })),
    ),
    settings: settings as unknown as Record<string, boolean>,
  }
}
