-- Adds member_count to get_my_teams, mirroring admin_list_team_profiles, so
-- the mentor-facing team cards can show roster-completion progress the same
-- way the admin ones do. Already applied to the project via the Supabase
-- MCP; kept here for reference / reruns elsewhere.

create or replace function public.get_my_teams(p_mentor_user_id uuid)
returns table (
  student_user_id uuid,
  login_id text,
  team_name text,
  team_lead_name text,
  team_logo_url text,
  domain_id text,
  venue text,
  project_title text,
  problem_statement text,
  solution_short text,
  solution_long text,
  member_count integer
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.login_id, a.name, a.team_lead_name, a.team_logo_url,
         ds.domain_id, a.venue, a.project_title, a.problem_statement,
         a.solution_short, a.solution_long,
         coalesce((select count(*) from public.team_members tm where tm.student_user_id = a.id), 0)::integer
  from public.mentor_assignments ma
  join public.app_users a on a.id = ma.student_user_id
  left join public.domain_selections ds on ds.user_id = a.id and ds.role = 'member'
  where ma.mentor_user_id = p_mentor_user_id
  order by a.name;
$$;

grant execute on function public.get_my_teams(uuid) to anon;
