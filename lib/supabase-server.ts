import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// A single shared client instead of a fresh one per call.
//
// This is safe here because the client is completely stateless: it uses the
// anon key with `persistSession: false`, and every privileged operation
// authorizes itself by passing the caller's user id into a security-definer
// RPC. There is no per-user state on the client to leak between requests.
//
// Reusing it also lets the underlying fetch keep connections warm, which
// matters because a single page render calls this from several fetchers.
//
// Programme years: the database shows one year at a time, picked by the
// `x-envision-edition` header. Rather than every caller passing the year, the
// client's fetch asks lib/edition.ts which year this request is for and adds
// the header itself (no header = the current year).
let client: SupabaseClient | null = null
let baseClient: SupabaseClient | null = null

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables")
  }
  return { url, key }
}

async function editionFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Imported lazily: lib/edition reads cookies and the session, and imports
  // this module back for its own (header-less) client.
  const { resolveRequestEdition, EDITION_HEADER } = await import("@/lib/edition")
  const edition = await resolveRequestEdition()
  if (!edition) return fetch(input, init)
  const headers = new Headers(init?.headers)
  headers.set(EDITION_HEADER, edition)
  return fetch(input, { ...init, headers })
}

export function getSupabaseServerClient(): SupabaseClient {
  if (client) return client
  const { url, key } = env()
  client = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: editionFetch },
  })
  return client
}

/** A client that always works in the current year and never looks at the
 *  request — for reading the list of years itself. */
export function getBaseSupabaseClient(): SupabaseClient {
  if (baseClient) return baseClient
  const { url, key } = env()
  baseClient = createClient(url, key, { auth: { persistSession: false } })
  return baseClient
}
