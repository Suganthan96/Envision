import { getSupabaseServerClient } from "@/lib/supabase-server"

type AppSettings = {
  studentDomainSelectionOpen: boolean
  mentorDomainSelectionOpen: boolean
}

export async function getAppSettings(): Promise<AppSettings> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_app_settings")
  const row = data?.[0]
  return {
    studentDomainSelectionOpen: Boolean(row?.student_domain_selection_open),
    mentorDomainSelectionOpen: Boolean(row?.mentor_domain_selection_open),
  }
}
