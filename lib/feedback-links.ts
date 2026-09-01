import { unstable_cache } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { CACHE_TAGS } from "@/lib/cache-tags"

// Cached until an admin edits a form link (/api/admin/feedback-links
// invalidates CACHE_TAGS.feedbackLinks).
export const getFeedbackLinks = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("get_feedback_links")

    const links: Record<string, string> = {}
    for (const row of (data ?? []) as { entry_id: string; url: string }[]) {
      links[row.entry_id] = row.url
    }
    return links
  },
  ["feedback-links"],
  { tags: [CACHE_TAGS.feedbackLinks] },
)
