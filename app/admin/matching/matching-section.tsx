import {
  MentorMatchingBoard,
  type MatchingMentor,
  type MatchingStudent,
  type VenueInfo,
} from "@/components/mentor-matching-board"
import { getSession } from "@/lib/get-session"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getDomains, type Domain } from "@/lib/domains"

/**
 * The three matching RPCs (mentors, students, venues) live here so the
 * /admin/matching shell can stream immediately and the board fills in
 * under <Suspense> once they resolve.
 */
export async function MatchingSection() {
  const session = await getSession()

  let mentors: MatchingMentor[] = []
  let students: MatchingStudent[] = []
  let venues: VenueInfo[] = []
  let domains: Domain[] = []

  if (session) {
    const supabase = getSupabaseServerClient()
    const [{ data: mentorData }, { data: studentData }, { data: venueData }, domainsResult] = await Promise.all([
      supabase.rpc("admin_list_assignable_mentors", { p_admin_user_id: session.userId }),
      supabase.rpc("admin_list_assignable_students", { p_admin_user_id: session.userId }),
      supabase.rpc("get_venues"),
      getDomains(),
    ])
    domains = domainsResult

    mentors = (
      (mentorData ?? []) as {
        mentor_user_id: string
        login_id: string
        name: string | null
        venue: string | null
        domain_ids: string[]
        assigned_student_ids: string[]
      }[]
    ).map((row) => ({
      mentorUserId: row.mentor_user_id,
      loginId: row.login_id,
      name: row.name,
      venue: row.venue,
      domainIds: row.domain_ids,
    }))

    students = (
      (studentData ?? []) as {
        student_user_id: string
        login_id: string
        team_name: string | null
        team_lead_name: string | null
        phone: string | null
        email: string | null
        venue: string | null
        domain_id: string
        mentor_user_id: string | null
      }[]
    ).map((row) => ({
      studentUserId: row.student_user_id,
      loginId: row.login_id,
      teamName: row.team_name,
      teamLeadName: row.team_lead_name,
      phone: row.phone,
      email: row.email,
      venue: row.venue,
      domainId: row.domain_id,
      mentorUserId: row.mentor_user_id,
    }))

    venues = ((venueData ?? []) as { code: string; team_capacity: number; team_count: number }[]).map((row) => ({
      code: row.code,
      teamCapacity: row.team_capacity,
      teamCount: row.team_count,
    }))
  }

  return (
    <MentorMatchingBoard
      initialMentors={mentors}
      initialStudents={students}
      initialVenues={venues}
      domains={domains}
    />
  )
}
