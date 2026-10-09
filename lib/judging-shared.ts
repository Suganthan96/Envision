/**
 * The judging types and the pure venue-resolution helper — no server code, so
 * client components can import them. lib/judging.ts re-exports all of it.
 */

export interface JudgingVenue {
  id: string
  name: string
  sortOrder: number
}

export type JudgingScope = "team" | "mentor" | "theme"

/** 'judging' = the room a team presents in; 'waiting' = where it waits. */
export type VenueKind = "judging" | "waiting"

export interface JudgingAssignment {
  kind: VenueKind
  scope: JudgingScope
  refId: string
  venueId: string
}

export interface RubricRow {
  label: string
  max: number
}

export interface JudgingSettings {
  reportHeading: string
  rubric: RubricRow[]
  facultyHeading: string
  facultyTiming: string
}

export const DEFAULT_RUBRIC: RubricRow[] = [
  { label: "Background Study", max: 10 },
  { label: "Problem Statement", max: 15 },
  { label: "User Identification", max: 10 },
  { label: "Solution", max: 5 },
  { label: "Team work and presentation", max: 10 },
]

/**
 * A team's presentation venue is layered: its own assignment wins, then its
 * mentor's, then its theme's. Returns the resolving level too so the UI can
 * show where the value came from.
 */
export function resolveJudgingVenue(
  assignments: JudgingAssignment[],
  team: { studentUserId: string; mentorUserId: string | null; domainId: string | null },
  kind: VenueKind = "judging",
): { venueId: string | null; source: JudgingScope | null } {
  const byKey = new Map(
    assignments.filter((a) => a.kind === kind).map((a) => [`${a.scope}:${a.refId}`, a.venueId]),
  )
  const team_ = byKey.get(`team:${team.studentUserId}`)
  if (team_) return { venueId: team_, source: "team" }
  if (team.mentorUserId) {
    const m = byKey.get(`mentor:${team.mentorUserId}`)
    if (m) return { venueId: m, source: "mentor" }
  }
  if (team.domainId) {
    const t = byKey.get(`theme:${team.domainId}`)
    if (t) return { venueId: t, source: "theme" }
  }
  return { venueId: null, source: null }
}
