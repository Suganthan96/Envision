// Cache tags for globally-shared, admin-managed data.
//
// Everything tagged here is identical for every visitor and only changes
// when an admin edits it, so it's cached indefinitely and invalidated
// explicitly by the admin API route that writes it. That keeps reads
// instant without ever serving stale data.
//
// Per-user data (team rosters, projects, logos, mentor profiles,
// assignments, domain selection counts) is deliberately NOT cached — it
// must always reflect the signed-in user's latest state.
//
// This module holds ONLY the tag names and imports nothing, so it is safe to
// import from modules that also get pulled into the client bundle (e.g.
// lib/judging.ts, which exports the pure `resolveJudgingVenue` helper used by
// a client component). The invalidation helper lives in lib/revalidate.ts
// because `revalidateTag`/`revalidatePath` are server-only.

export const CACHE_TAGS = {
  appSettings: "app-settings",
  domains: "domains",
  timeline: "timeline",
  feedbackLinks: "feedback-links",
  venues: "venues",
  domainCapacities: "domain-capacities",
  projectGuideline: "project-guideline",
  /** Judging venues, their layered assignments, and the rubric/report
   *  settings — read on every /admin/submissions load, written only from
   *  /api/admin/judging. */
  judging: "judging",
  /** The public /showcase and /mentors listings. These are also on a short
   *  time-based revalidate (students edit their projects continuously), but
   *  admin actions that change *visibility* — hiding or deleting a user —
   *  must take effect immediately rather than after the timer. */
  publicShowcase: "public-showcase",
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]
