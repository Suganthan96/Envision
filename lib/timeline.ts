export interface TimelineEntry {
  id: string
  label: string
  date?: string
  title: string
  resource: string
  venue?: string
  hasFeedbackForm?: boolean
}

export interface TimelinePhase {
  id: string
  title: string
  entries: TimelineEntry[]
}

// Fallback used only if the DB row is ever empty (e.g. a fresh database
// before the admin has entered anything at /admin/timeline). The DB
// (public.timeline_settings, via get_timeline()/admin_set_timeline()) is
// the source of truth once seeded — see getTimelinePhases() below.
export const DEFAULT_TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: "phase-1",
    title: "Phase 1",
    entries: [
      {
        id: "day-1",
        label: "Day 1",
        date: "21.08.2026 (AN)",
        title: "Inauguration, Officials Address, IIC & Envision Walkthrough, Experience Sharing, Team Formation and Domain Introduction",
        resource: "IIC Team",
        venue: "G01 — 40 Teams & Student Mentors · C30 — 23 Teams & Student Mentors",
      },
      {
        id: "day-2",
        label: "Day 2",
        date: "24.08.2026 (AN)",
        title: "Awareness Session: Entrepreneurship and Innovation as Career Opportunities",
        resource: "External Expert (2 Nos) — eCirkle",
        venue: "G01 — 40 Teams & Student Mentors · C30 — 23 Teams & Student Mentors",
        hasFeedbackForm: true,
      },
      {
        id: "day-3",
        label: "Day 3",
        date: "25.08.2026 (AN)",
        title: "Session on Problem Solving and Ideation",
        resource: "External Expert (2 Nos) — Ms. Sujaya Rao (Startup Mentor), Ms. Agnes Roshini (EDII)",
        venue: "G01 — 40 Teams & Student Mentors · C30 — 23 Teams & Student Mentors",
        hasFeedbackForm: true,
      },
      {
        id: "day-4",
        label: "Day 4",
        date: "27.08.2026 (AN)",
        title: "Problem Identification",
        resource: "IIC Team",
        venue: "G01, C30, F11, Fab Lab",
      },
      {
        id: "day-5",
        label: "Day 5",
        date: "28.08.2026 (AN)",
        title: "Ideation",
        resource: "IIC Team",
        venue: "G01, C30, F11, Fab Lab",
      },
      {
        id: "day-6",
        label: "Day 6",
        date: "29.08.2026 (AN)",
        title: "Session on Achieving Problem-Solution Fit",
        resource: "External Expert (2 Nos) — Mr. Pathy Lakshminarayanan (PALS), Ms. Subashini Ganesan (TCS)",
        venue: "G01 — 40 Teams & Student Mentors · C30 — 23 Teams & Student Mentors",
        hasFeedbackForm: true,
      },
      {
        id: "day-7",
        label: "Day 7",
        date: "31.08.2026 (AN)",
        title: "Solutioning — PPT Preparation",
        resource: "IIC Team",
        venue: "G01, C30, F11, Fab Lab",
      },
      {
        id: "day-8",
        label: "Day 8",
        date: "01.09.2026 (AN)",
        title: "Pitch Your Idea",
        resource: "External Juries, IIC Team, HoDs",
        venue: "G01, C30, F11, Fab Lab",
      },
    ],
  },
  {
    id: "phase-2",
    title: "Phase 2",
    entries: [
      {
        id: "week-1",
        label: "Week 1",
        date: "Wed, Periods 4–5",
        title: "Customer Persona & Market Research on Existing Products",
        resource: "IIC Team",
      },
      {
        id: "week-2",
        label: "Week 2",
        date: "Wed, Periods 4–5",
        title: "Go to Market Strategy",
        resource: "IIC Team",
      },
      {
        id: "week-3",
        label: "Week 3",
        date: "Wed, Periods 4–5",
        title: "Session on Electronic Product Design",
        resource: "External Expert (2 Nos)",
      },
      {
        id: "week-4",
        label: "Week 4",
        date: "Wed, Periods 4–5",
        title: "Session on Rapid Prototyping — 3D Printer",
        resource: "External Expert (2 Nos)",
      },
      {
        id: "week-5",
        label: "Week 5",
        date: "Wed, Periods 4–5",
        title: "Principal Component Analysis & Technology Stack Finalization",
        resource: "IIC Team",
      },
      {
        id: "week-6",
        label: "Week 6",
        date: "Wed, Periods 4–5",
        title: "PoC Development",
        resource: "IIC Team",
      },
      {
        id: "week-7",
        label: "Week 7",
        date: "Wed, Periods 4–5",
        title: "Internal Review",
        resource: "IIC Team",
      },
      {
        id: "week-8",
        label: "Week 8",
        date: "Wed, Periods 4–5",
        title: "Prototype Development",
        resource: "IIC Team",
      },
      {
        id: "week-9",
        label: "Week 9",
        date: "Wed, Periods 4–5",
        title: "Prototype Development",
        resource: "IIC Team",
      },
      {
        id: "week-10",
        label: "Week 10",
        date: "Wed, Periods 4–5",
        title: "Prototype Development",
        resource: "IIC Team",
      },
      {
        id: "week-11",
        label: "Week 11",
        date: "Wed, Periods 4–5",
        title: "Prototype Validation",
        resource: "IIC Team",
      },
      {
        id: "week-12",
        label: "Week 12",
        date: "Wed, Periods 4–5",
        title: "Innovation Day (Expo)",
        resource: "IIC Team",
      },
    ],
  },
]

// Cached until an admin saves the timeline (/api/admin/timeline invalidates
// CACHE_TAGS.timeline). Everything server-side is still imported lazily to
// keep this module safe to import from client components (the
// DEFAULT_TIMELINE_PHASES/types above are shared).
let cachedGetTimelinePhases: (() => Promise<TimelinePhase[]>) | null = null

export async function getTimelinePhases(): Promise<TimelinePhase[]> {
  if (!cachedGetTimelinePhases) {
    const [{ unstable_cache }, { CACHE_TAGS }] = await Promise.all([
      import("next/cache"),
      import("@/lib/cache-tags"),
    ])
    cachedGetTimelinePhases = unstable_cache(
      async () => {
        const { getSupabaseServerClient } = await import("@/lib/supabase-server")
        const supabase = getSupabaseServerClient()
        const { data } = await supabase.rpc("get_timeline")

        if (Array.isArray(data) && data.length > 0) {
          return data as TimelinePhase[]
        }
        return DEFAULT_TIMELINE_PHASES
      },
      ["timeline"],
      { tags: [CACHE_TAGS.timeline] },
    )
  }
  return cachedGetTimelinePhases()
}
