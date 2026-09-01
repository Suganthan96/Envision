import { getSupabaseServerClient } from "@/lib/supabase-server"

export interface TeamProject {
  projectTitle: string | null
  problemStatement: string | null
  solutionShort: string | null
  solutionLong: string | null
}

export async function getTeamProject(userId: string): Promise<TeamProject> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc("get_team_project", { p_user_id: userId })
  const row = data?.[0]
  return {
    projectTitle: row?.project_title ?? null,
    problemStatement: row?.problem_statement ?? null,
    solutionShort: row?.solution_short ?? null,
    solutionLong: row?.solution_long ?? null,
  }
}
