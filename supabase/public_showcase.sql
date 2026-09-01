-- Public, unauthenticated showcase: every team's project and every mentor's
-- profile, shown on /showcase and /mentors with no login required. Unlike
-- the admin/mentor-facing equivalents (admin_list_team_profiles,
-- get_my_teams, admin_list_mentor_profiles), these take no admin/mentor id
-- and do no authorization check by design — the whole point is public
-- access. They deliberately still omit anything private beyond names: no
-- emails/departments/phone, no venue/matching internals.
--
-- Already applied to the project via the Supabase MCP; kept here for
-- reference / reruns elsewhere.

create or replace function public.get_public_showcase_teams()
returns table (
  student_user_id uuid,
  login_id text,
  team_name text,
  team_lead_name text,
  team_logo_url text,
  domain_id text,
  project_title text,
  problem_statement text,
  solution_short text,
  solution_long text,
  member_names text[],
  mentor_name text
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.login_id,
    u.name,
    u.team_lead_name,
    u.team_logo_url,
    ds.domain_id,
    u.project_title,
    u.problem_statement,
    u.solution_short,
    u.solution_long,
    coalesce(
      (select array_agg(tm.name order by tm.sort_order, tm.created_at) from public.team_members tm
       where tm.student_user_id = u.id),
      '{}'::text[]
    ),
    (select mu.name from public.mentor_assignments ma
     join public.app_users mu on mu.id = ma.mentor_user_id
     where ma.student_user_id = u.id)
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  where u.role = 'member'
  order by u.login_id;
$$;

-- Looked up by login_id, not the internal uuid — nicer public URLs
-- (/showcase/57) and avoids exposing internal ids.
create or replace function public.get_public_showcase_team(p_login_id text)
returns table (
  student_user_id uuid,
  login_id text,
  team_name text,
  team_lead_name text,
  team_logo_url text,
  domain_id text,
  project_title text,
  problem_statement text,
  solution_short text,
  solution_long text,
  member_names text[],
  mentor_name text
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.login_id,
    u.name,
    u.team_lead_name,
    u.team_logo_url,
    ds.domain_id,
    u.project_title,
    u.problem_statement,
    u.solution_short,
    u.solution_long,
    coalesce(
      (select array_agg(tm.name order by tm.sort_order, tm.created_at) from public.team_members tm
       where tm.student_user_id = u.id),
      '{}'::text[]
    ),
    (select mu.name from public.mentor_assignments ma
     join public.app_users mu on mu.id = ma.mentor_user_id
     where ma.student_user_id = u.id)
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  where u.role = 'member' and u.login_id = p_login_id;
$$;

create or replace function public.get_public_mentor_showcase()
returns table (
  mentor_user_id uuid,
  login_id text,
  name text,
  avatar_url text,
  bio text,
  domain_ids text[]
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.login_id,
    u.name,
    u.avatar_url,
    u.bio,
    coalesce(
      (select array_agg(ds.domain_id order by ds.created_at) from public.domain_selections ds
       where ds.user_id = u.id and ds.role = 'mentor'),
      '{}'::text[]
    )
  from public.app_users u
  where u.role = 'mentor'
  order by u.login_id;
$$;

grant execute on function public.get_public_showcase_teams() to anon;
grant execute on function public.get_public_showcase_team(text) to anon;
grant execute on function public.get_public_mentor_showcase() to anon;
