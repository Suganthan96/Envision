import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function getFeedbackLinks(): Promise<Record<string, string>> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_feedback_links")

  const links: Record<string, string> = {}
  for (const row of (data ?? []) as { entry_id: string; url: string }[]) {
    links[row.entry_id] = row.url
  }
  return links
}
