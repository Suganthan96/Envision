import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * A team's final submission is a single link — either a Canva design URL or
 * the "anyone with the link" URL of a file the team uploaded to the shared
 * Google Drive folder themselves. The app just stores and shows the URL; it
 * never touches Google. (Stored in the `submission_canva_url` column, which
 * predates the field being used for Drive links too.)
 */
export interface TeamSubmission {
  link: string | null
  updatedAt: string | null
}

export const EMPTY_SUBMISSION: TeamSubmission = { link: null, updatedAt: null }

export async function getTeamSubmission(userId: string): Promise<TeamSubmission> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_team_submission", { p_user_id: userId })
  const row = data?.[0]
  if (!row) return EMPTY_SUBMISSION
  return {
    link: row.submission_canva_url ?? null,
    updatedAt: row.submission_updated_at ?? null,
  }
}
