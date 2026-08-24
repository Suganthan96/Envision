import { getSupabaseServerClient } from "@/lib/supabase-server"

type AppSettings = {
  studentDomainSelectionOpen: boolean
  mentorDomainSelectionOpen: boolean
  studentCanSelect: boolean
  mentorCanSelect: boolean
  teamNameEditOpen: boolean
}

export async function getAppSettings(): Promise<AppSettings> {
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
}
