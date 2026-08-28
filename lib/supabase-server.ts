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
let client: SupabaseClient | null = null

export function getSupabaseServerClient(): SupabaseClient {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables")
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  })
  return client
}
