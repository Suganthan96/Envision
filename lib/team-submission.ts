import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * A team's final submission: a Google Drive share link (required) and an
 * optional Canva link. The app only stores and shows the URLs — it never
 * calls Google. Stored in columns kept from an earlier design:
 *   driveUrl  -> submission_file_url
 *   canvaUrl  -> submission_canva_url
 */
export interface TeamSubmission {
  driveUrl: string | null
  canvaUrl: string | null
  updatedAt: string | null
}

export const EMPTY_SUBMISSION: TeamSubmission = {
  driveUrl: null,
  canvaUrl: null,
  updatedAt: null,
}

export async function getTeamSubmission(userId: string): Promise<TeamSubmission> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_team_submission", { p_user_id: userId })
  const row = data?.[0]
  if (!row) return EMPTY_SUBMISSION
  return {
    driveUrl: row.submission_file_url ?? null,
    canvaUrl: row.submission_canva_url ?? null,
    updatedAt: row.submission_updated_at ?? null,
  }
}
