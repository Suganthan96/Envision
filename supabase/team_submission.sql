-- Team submission: a single link — a Canva design URL, or the "anyone with
-- the link" URL of a file the team uploaded themselves to the shared Google
-- Drive folder. The app only stores/echoes the URL; it never calls Google.
-- Editable by the student team on the Project page; shown read-only on the
-- mentor's My Teams team detail, the admin team-profiles team detail, and
-- the admin Submissions page.
--
-- The link lives in `submission_canva_url` (kept from an earlier design that
-- also did in-app Drive uploads). The `submission_file_url/id/name` columns
-- and RPC out-params below are LEFTOVERS from that design — always null now,
-- harmless, safe to drop later.
--
-- Already applied to the project via the Supabase MCP; kept here for
-- reference / reruns elsewhere. This file also RE-DECLARES get_my_teams and
-- admin_list_team_profiles with the submission_* columns appended — the
-- canonical bodies otherwise live in team_project.sql and
-- admin_profile_directories.sql respectively.

alter table public.app_users
  add column if not exists submission_canva_url text,
  add column if not exists submission_file_url text,
  add column if not exists submission_file_id text,
  add column if not exists submission_file_name text,
  add column if not exists submission_updated_at timestamptz;

alter table public.app_users
  drop constraint if exists app_users_submission_canva_url_check;
alter table public.app_users
  add constraint app_users_submission_canva_url_check
  check (submission_canva_url is null or length(submission_canva_url) <= 500);

alter table public.app_users
  drop constraint if exists app_users_submission_file_name_check;
alter table public.app_users
  add constraint app_users_submission_file_name_check
  check (submission_file_name is null or length(submission_file_name) <= 300);

create or replace function public.get_team_submission(p_user_id uuid)
returns table (
  submission_canva_url text,
  submission_file_url text,
  submission_file_id text,
  submission_file_name text,
  submission_updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select submission_canva_url, submission_file_url, submission_file_id,
         submission_file_name, submission_updated_at
  from public.app_users
  where id = p_user_id and role = 'member';
$$;

create or replace function public.update_team_submission(
  p_user_id uuid,
  p_canva_url text,
  p_file_url text,
  p_file_id text,
  p_file_name text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_canva_url is not null and length(p_canva_url) > 500 then
    raise exception 'Canva link is too long';
  end if;
  if p_file_name is not null and length(p_file_name) > 300 then
    raise exception 'File name is too long';
  end if;

  update public.app_users
  set submission_canva_url = p_canva_url,
      submission_file_url = p_file_url,
      submission_file_id = p_file_id,
      submission_file_name = p_file_name,
      submission_updated_at = case
        when p_canva_url is null and p_file_url is null then null
        else now()
      end,
      updated_at = now()
  where id = p_user_id and role = 'member';

  return found;
end;
$$;

drop function if exists public.admin_list_submissions(uuid);
create function public.admin_list_submissions(p_admin_user_id uuid)
returns table (
  student_user_id uuid,
  login_id text,
  team_name text,
  team_lead_name text,
  project_title text,
  venue text,
  domain_id text,
  mentor_user_id uuid,
  mentor_name text,
  submission_canva_url text,
  submission_file_url text,
  submission_file_name text,
  submission_updated_at timestamptz
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
    u.project_title,
    coalesce(u.venue, m.venue),
    ds.domain_id,
    m.id,
    m.name,
    u.submission_canva_url,
    u.submission_file_url,
    u.submission_file_name,
    u.submission_updated_at
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  left join public.mentor_assignments ma on ma.student_user_id = u.id
  left join public.app_users m on m.id = ma.mentor_user_id
  where u.role = 'member'
  order by u.login_id;
end;
$$;

-- get_my_teams + admin_list_team_profiles re-declared with submission_* cols.
drop function if exists public.get_my_teams(uuid);
create function public.get_my_teams(p_mentor_user_id uuid)
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
  submission_canva_url text,
  submission_file_url text,
  submission_file_name text,
  submission_updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.login_id, a.name, a.team_lead_name, a.team_logo_url,
         ds.domain_id, a.venue, a.project_title, a.problem_statement,
         a.solution_short, a.solution_long,
         a.submission_canva_url, a.submission_file_url, a.submission_file_name,
         a.submission_updated_at
  from public.mentor_assignments ma
  join public.app_users a on a.id = ma.student_user_id
  left join public.domain_selections ds on ds.user_id = a.id and ds.role = 'member'
  where ma.mentor_user_id = p_mentor_user_id
  order by a.name;
$$;

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
  mentor_login_id text,
  submission_canva_url text,
  submission_file_url text,
  submission_file_name text,
  submission_updated_at timestamptz
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
    u.id, u.login_id, u.name, u.team_lead_name, u.team_logo_url,
    coalesce(u.venue, m.venue), ds.domain_id,
    u.project_title, u.problem_statement, u.solution_short, u.solution_long,
    coalesce((select count(*) from public.team_members tm where tm.student_user_id = u.id), 0)::integer,
    m.id, m.name, m.login_id,
    u.submission_canva_url, u.submission_file_url, u.submission_file_name, u.submission_updated_at
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  left join public.mentor_assignments ma on ma.student_user_id = u.id
  left join public.app_users m on m.id = ma.mentor_user_id
  where u.role = 'member'
  order by u.login_id;
end;
$$;

grant execute on function public.get_team_submission(uuid) to anon;
grant execute on function public.update_team_submission(uuid, text, text, text, text) to anon;
grant execute on function public.admin_list_submissions(uuid) to anon;
grant execute on function public.get_my_teams(uuid) to anon;
grant execute on function public.admin_list_team_profiles(uuid) to anon;
