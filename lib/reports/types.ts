/**
 * Everything the admin reports are built from, for one programme year.
 * Loaded once on the server (lib/reports/data.ts, /api/admin/reports) and
 * turned into PDFs and spreadsheets in the browser. Pure types: safe anywhere.
 */

export interface ReportMember {
  name: string
  email: string | null
  department: string | null
}

export interface ReportTeam {
  studentUserId: string
  loginId: string
  teamName: string
  teamLeadName: string | null
  email: string | null
  phone: string | null
  logoUrl: string | null
  domainId: string | null
  domainTitle: string | null
  mentorUserId: string | null
  mentorLoginId: string | null
  mentorName: string | null
  labVenue: string | null
  judgingVenue: string | null
  waitingVenue: string | null
  projectTitle: string | null
  problemStatement: string | null
  solutionShort: string | null
  solutionLong: string | null
  driveUrl: string | null
  canvaUrl: string | null
  submittedAt: string | null
  members: ReportMember[]
  mustChangePassword: boolean
}

export interface ReportMentor {
  userId: string
  loginId: string
  name: string | null
  phone: string | null
  email: string | null
  hasPhoto: boolean
  hasBio: boolean
  domainIds: string[]
  labVenue: string | null
  teamLoginIds: string[]
  mustChangePassword: boolean
}

export interface ReportEvaluator {
  userId: string
  loginId: string
  name: string | null
  role: "faculty" | "jury"
  rooms: string[]
  extraTeamLoginIds: string[]
}

export interface ReportAccount {
  loginId: string
  role: string
  name: string | null
  phone: string | null
  email: string | null
  hidden: boolean
  mustChangePassword: boolean
}

export interface ReportDomain {
  id: string
  title: string
  sdgs: number[]
  teamCapacity: number
  mentorCapacity: number
}

export interface ReportSheet {
  studentUserId: string
  evaluatorLoginId: string
  evaluatorName: string | null
  evaluatorRole: "faculty" | "jury"
  marks: Record<string, number>
  total: number
  updatedAt: string
}

export interface ReportRound {
  id: string
  name: string
  criteria: { label: string; max: number }[]
  max: number
  live: boolean
  published: boolean
  tiebreak: string[]
  /** Round score per team (the evaluators' average, or the admin's entry). */
  marks: Record<string, Record<string, number>>
  sheets: ReportSheet[]
}

export interface ReportTimelineEntry {
  phase: string
  label: string
  date: string | null
  title: string
  venue: string | null
  resource: string | null
}

export interface ReportData {
  year: { id: string; label: string; isCurrent: boolean }
  generatedAt: string
  teams: ReportTeam[]
  mentors: ReportMentor[]
  evaluators: ReportEvaluator[]
  accounts: ReportAccount[]
  domains: ReportDomain[]
  rounds: ReportRound[]
  judgingRooms: string[]
  waitingRooms: string[]
  labVenues: { code: string; capacity: number }[]
  timeline: ReportTimelineEntry[]
  settings: Record<string, boolean>
}
