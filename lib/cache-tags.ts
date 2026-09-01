import { revalidateTag, revalidatePath } from "next/cache"

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

export const CACHE_TAGS = {
  appSettings: "app-settings",
  domains: "domains",
  timeline: "timeline",
  feedbackLinks: "feedback-links",
  venues: "venues",
  domainCapacities: "domain-capacities",
  projectGuideline: "project-guideline",
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]

/**
 * Purge cached shared data after an admin writes to it.
 *
 * `revalidatePath("/", "layout")` is what actually does the work here:
 * on this Next version `revalidateTag` alone does NOT purge entries created
 * by `unstable_cache` (verified — a toggled setting kept serving the old
 * value until the server restarted), whereas the path revalidation clears
 * them immediately. The `revalidateTag` call is kept alongside it so the
 * invalidation stays precise if/when tag purging covers `unstable_cache`.
 *
 * Call this on every successful admin mutation of shared data, otherwise
 * students and mentors will keep seeing the pre-edit values.
 */
export function revalidateSharedData(tag: CacheTag) {
  revalidateTag(tag, "seconds")
  revalidatePath("/", "layout")
}
