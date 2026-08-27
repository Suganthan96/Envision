-- Team project details: problem statement, a short solution summary, and a
-- longer solution writeup. Editable by the student team from a new "Project"
-- dashboard card, visible to their mentor via get_my_teams (My Teams page).
-- Already applied to the project via the Supabase MCP; kept here for
-- reference / reruns elsewhere.

alter table public.app_users
  add column if not exists problem_statement text,
  add column if not exists solution_short text,
  add column if not exists solution_long text;

alter table public.app_users
  drop constraint if exists app_users_problem_statement_length_check;
alter table public.app_users
  add constraint app_users_problem_statement_length_check
  check (problem_statement is null or length(problem_statement) <= 1000);

alter table public.app_users
  drop constraint if exists app_users_solution_short_length_check;
alter table public.app_users
  add constraint app_users_solution_short_length_check
  check (solution_short is null or length(solution_short) <= 300);

alter table public.app_users
  drop constraint if exists app_users_solution_long_length_check;
alter table public.app_users
  add constraint app_users_solution_long_length_check
  check (solution_long is null or length(solution_long) <= 4000);

create or replace function public.get_team_project(p_user_id uuid)
returns table (problem_statement text, solution_short text, solution_long text)
language sql
security definer
set search_path = public
as $$
  select problem_statement, solution_short, solution_long
  from public.app_users
  where id = p_user_id;
$$;

create or replace function public.update_team_project(
  p_user_id uuid,
  p_problem_statement text,
  p_solution_short text,
  p_solution_long text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_problem_statement is not null and length(p_problem_statement) > 1000 then
    raise exception 'Problem statement is too long';
  end if;
  if p_solution_short is not null and length(p_solution_short) > 300 then
    raise exception 'Solution summary is too long';
  end if;
  if p_solution_long is not null and length(p_solution_long) > 4000 then
    raise exception 'Solution write-up is too long';
  end if;

  update public.app_users
  set problem_statement = p_problem_statement,
      solution_short = p_solution_short,
      solution_long = p_solution_long,
      updated_at = now()
  where id = p_user_id and role = 'member';

  return found;
end;
$$;

-- get_my_teams now also returns the project fields for each assigned team.
create or replace function public.get_my_teams(p_mentor_user_id uuid)
returns table (
  student_user_id uuid,
  login_id text,
  team_name text,
  team_lead_name text,
  team_logo_url text,
  domain_id text,
  venue text,
  problem_statement text,
  solution_short text,
  solution_long text
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.login_id, a.name, a.team_lead_name, a.team_logo_url,
         ds.domain_id, a.venue, a.problem_statement, a.solution_short, a.solution_long
  from public.mentor_assignments ma
  join public.app_users a on a.id = ma.student_user_id
  left join public.domain_selections ds on ds.user_id = a.id and ds.role = 'member'
  where ma.mentor_user_id = p_mentor_user_id
  order by a.name;
$$;

grant execute on function public.get_team_project(uuid) to anon;
grant execute on function public.update_team_project(uuid, text, text, text) to anon;
grant execute on function public.get_my_teams(uuid) to anon;
