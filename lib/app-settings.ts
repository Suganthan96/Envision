import { unstable_cache } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { CACHE_TAGS } from "@/lib/cache-tags"

type AppSettings = {
  studentDomainSelectionOpen: boolean
  mentorDomainSelectionOpen: boolean
  studentCanSelect: boolean
  mentorCanSelect: boolean
  teamNameEditOpen: boolean
}

// Read on nearly every page render but only written from /api/admin/settings,
// which invalidates CACHE_TAGS.appSettings — so this is cached until an admin
// actually flips a toggle.
export const getAppSettings = unstable_cache(
  async (): Promise<AppSettings> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc("get_app_settings")
    const row = data?.[0]
    return {
      studentDomainSelectionOpen: Boolean(row?.student_domain_selection_open),
      mentorDomainSelectionOpen: Boolean(row?.mentor_domain_selection_open),
      studentCanSelect: Boolean(row?.student_can_select),
      mentorCanSelect: Boolean(row?.mentor_can_select),
      // Defaults to true when the row is missing so editing isn't silently
      // locked out if the settings row can't be read.
      teamNameEditOpen: row?.team_name_edit_open ?? true,
    }
  },
  ["app-settings"],
  { tags: [CACHE_TAGS.appSettings] },
)
