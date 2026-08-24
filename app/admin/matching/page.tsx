import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  MentorMatchingBoard,
  type MatchingMentor,
  type MatchingStudent,
  type VenueInfo,
} from "@/components/mentor-matching-board"
import { getSession } from "@/lib/get-session"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function AdminMatchingPage() {
  const session = await getSession()

  let mentors: MatchingMentor[] = []
  let students: MatchingStudent[] = []
  let venues: VenueInfo[] = []

  if (session) {
    const supabase = getSupabaseServerClient()
    const [{ data: mentorData }, { data: studentData }, { data: venueData }] = await Promise.all([
      supabase.rpc("admin_list_assignable_mentors", { p_admin_user_id: session.userId }),
      supabase.rpc("admin_list_assignable_students", { p_admin_user_id: session.userId }),
      supabase.rpc("get_venues"),
    ])

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
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <div className="w-8 h-px bg-primary" />
            <span className="font-serif text-xl text-foreground">Envision</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="inline" />
            <LogoutButton />
          </div>
        </div>

        <div className="flex items-center gap-6 mb-8 flex-wrap">
          <Link href="/admin" className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider">
            User Management
          </Link>
          <Link
            href="/admin/mentors"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Mentor Selections
          </Link>
          <Link
            href="/admin/students"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Student Selections
          </Link>
          <span className="text-primary text-sm uppercase tracking-wider border-b border-primary pb-1">
            Mentor Matching
          </span>
          <Link
            href="/admin/timeline"
            className="text-muted-foreground hover:text-primary text-sm uppercase tracking-wider"
          >
            Timeline
          </Link>
        </div>

        <p className="text-primary tracking-[0.2em] uppercase text-sm mb-4">Admin Portal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
          Mentor <span className="text-gold-gradient">Matching</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Manage venues and their team capacity below, then drag a team onto a mentor to assign it. Each mentor
          takes at most 2 teams, and a team can only join a mentor in the same venue. Use Download PDF for the
          final printable list, grouped by venue.
        </p>

        <MentorMatchingBoard initialMentors={mentors} initialStudents={students} initialVenues={venues} />
      </div>
    </main>
  )
}
