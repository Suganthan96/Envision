import { cookies } from "next/headers"
import { unstable_cache } from "next/cache"
import { editionStore } from "@/lib/edition-context"
import { getSession } from "@/lib/get-session"
import { getBaseSupabaseClient } from "@/lib/supabase-server"
import { CACHE_TAGS } from "@/lib/cache-tags"

/**
 * Programme years ("editions"): 2026-27, 2027-28, …
 *
 * Every year's data lives side by side in the database; each table's view
 * shows one year, chosen per request by the `x-envision-edition` header
 * (supabase/editions.sql). This module decides which year a request is for:
 *
 *   - work pinned with `withEdition(year, …)` uses that year (public pages
 *     showing a past year, cached loaders, the image route);
 *   - an admin uses the year picked in the year switcher (EDITION_COOKIE);
 *   - everyone else, and anything outside a request, uses the current year.
 *
 * The shared server client (lib/supabase-server.ts) asks this on every
 * database call, so the rest of the app never has to pass the year around.
 */

export const EDITION_COOKIE = "envision_edition"
export const EDITION_HEADER = "x-envision-edition"

export interface Edition {
  id: string
  label: string
  isCurrent: boolean
  createdAt: string | null
}

/** Used until the year RPCs exist, and if they ever fail. */
const FALLBACK: Edition[] = [{ id: "2026-27", label: "2026–27", isCurrent: true, createdAt: null }]

/** Every year, newest first. Adding a year or switching the current one
 *  purges the tag; the 5-minute expiry also heals edits made straight in the
 *  database. */
export const getEditions = unstable_cache(
  async (): Promise<Edition[]> => {
    const { data, error } = await getBaseSupabaseClient().rpc("get_editions")
    if (error || !Array.isArray(data) || data.length === 0) return FALLBACK
    return (data as { id: string; label: string; is_current: boolean; created_at: string | null }[]).map((e) => ({
      id: e.id,
      label: e.label,
      isCurrent: e.is_current,
      createdAt: e.created_at,
    }))
  },
  ["editions"],
  { tags: [CACHE_TAGS.editions], revalidate: 300 },
)

export async function getCurrentEdition(): Promise<Edition> {
  const all = await getEditions()
  return all.find((e) => e.isCurrent) ?? all[0] ?? FALLBACK[0]
}

/** A year id from untrusted input (a cookie, a ?year= param), if it is real. */
export async function validEditionId(raw: string | null | undefined): Promise<string | null> {
  if (!raw) return null
  const all = await getEditions()
  return all.some((e) => e.id === raw) ? raw : null
}

/**
 * The year this request works in, or null for the current year. Never throws:
 * outside a request (or inside a cache scope with no pinned year) it falls
 * back to the current year.
 */
export async function resolveRequestEdition(): Promise<string | null> {
  const pinned = editionStore.getStore()
  if (pinned !== undefined) return pinned
  try {
    const session = await getSession()
    if (session?.role !== "admin") return null
    const picked = (await cookies()).get(EDITION_COOKIE)?.value
    const id = await validEditionId(picked)
    if (!id) return null
    const current = await getCurrentEdition()
    return id === current.id ? null : id
  } catch {
    return null
  }
}

/** The year this request works in, resolved to a concrete year. */
export async function getRequestEdition(): Promise<Edition> {
  const [id, all] = await Promise.all([resolveRequestEdition(), getEditions()])
  return all.find((e) => e.id === id) ?? (await getCurrentEdition())
}

/** Runs `fn` against one year (null = the current year). */
export function withEdition<T>(edition: string | null, fn: () => T): T {
  return editionStore.run(edition, fn)
}

/**
 * `unstable_cache` with the year in the cache key, so one year's cached data
 * is never served for another. The year is resolved outside the cache scope
 * (where cookies can be read) and pinned inside it.
 */
export function editionCached<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  options: { tags?: string[]; revalidate?: number | false },
): (...args: A) => Promise<R> {
  const cached = unstable_cache(
    (edition: string, ...args: A) => withEdition(edition, () => fn(...args)),
    keyParts,
    options,
  )
  return async (...args: A) => {
    const edition = (await resolveRequestEdition()) ?? (await getCurrentEdition()).id
    return cached(edition, ...args)
  }
}
