-- Admin-facing directories: every mentor's profile (photo + bio) and every
-- team's profile (logo, roster size, project) for the searchable card views
-- on /admin/mentor-profiles and /admin/team-profiles. Already applied to the
-- project via the Supabase MCP; kept here for reference / reruns elsewhere.

create or replace function public.admin_list_mentor_profiles(p_admin_user_id uuid)
returns table (
  mentor_user_id uuid,
  login_id text,
  name text,
  avatar_url text,
  bio text,
  venue text,
  domain_ids text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id,
    u.login_id,
    u.name,
    u.avatar_url,
    u.bio,
    u.venue,
    coalesce(
      (select array_agg(ds.domain_id order by ds.created_at) from public.domain_selections ds
       where ds.user_id = u.id and ds.role = 'mentor'),
      '{}'::text[]
    )
  from public.app_users u
  where u.role = 'mentor'
  order by u.login_id;
end;
$$;

-- team_name is DROP + CREATE (not CREATE OR REPLACE) because the return
-- type changed when mentor columns were added.
drop function if exists public.admin_list_team_profiles(uuid);

create function public.admin_list_team_profiles(p_admin_user_id uuid)
returns table (
  student_user_id uuid,
  login_id text,
  team_name text,
  team_lead_name text,
  team_logo_url text,
  venue text,
  domain_id text,
  project_title text,
  problem_statement text,
  solution_short text,
  solution_long text,
  member_count integer,
  mentor_user_id uuid,
  mentor_name text,
  mentor_login_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id,
    u.login_id,
    u.name,
    u.team_lead_name,
    u.team_logo_url,
    -- A team's venue follows its assigned mentor. Prefer the value copied
    -- onto the team at assignment time, but fall back to the mentor's
    -- current venue so teams assigned before that copy existed (or before
    -- the mentor had a venue) still resolve instead of showing blank.
    coalesce(u.venue, m.venue),
    ds.domain_id,
    u.project_title,
    u.problem_statement,
    u.solution_short,
    u.solution_long,
    coalesce((select count(*) from public.team_members tm where tm.student_user_id = u.id), 0)::integer,
    m.id,
    m.name,
    m.login_id
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  left join public.mentor_assignments ma on ma.student_user_id = u.id
  left join public.app_users m on m.id = ma.mentor_user_id
  where u.role = 'member'
  order by u.login_id;
end;
$$;

grant execute on function public.admin_list_mentor_profiles(uuid) to anon;
grant execute on function public.admin_list_team_profiles(uuid) to anon;
