-- app_users.hidden: an admin toggle (eye icon in User Management) that
-- removes a user from every directory/list without deleting them. Applied
-- via Supabase MCP; kept here for reference / reruns elsewhere.
--
-- The column is added here; the actual filtering lives in each directory
-- RPC as `and u.hidden is not true` (member rows) or `and a.hidden is not
-- true` (get_my_teams). Those RPCs' canonical bodies are in their own
-- files (team_project.sql, admin_profile_directories.sql, public_showcase.sql,
-- mentor_assignments.sql, team_submission.sql) — when re-running from
-- scratch, apply this AFTER them and re-add the hidden filter, or just run
-- the current dump. RPCs carrying the filter as of this migration:
--   admin_list_team_profiles, admin_list_submissions, admin_list_mentor_profiles,
--   admin_list_assignable_students, admin_list_assignable_mentors,
--   get_my_teams, get_public_showcase_teams, get_public_showcase_team,
--   get_public_mentor_showcase

alter table public.app_users add column if not exists hidden boolean not null default false;

-- admin_list_users returns `hidden` so the User Management table can show
-- and toggle it (drop+create: return type changed).
drop function if exists public.admin_list_users(uuid);
create function public.admin_list_users(p_admin_user_id uuid)
returns table (
  login_id text, role text, must_change_password boolean, updated_at timestamptz,
  name text, phone text, email text, hidden boolean
)
language plpgsql security definer set search_path to 'public', 'extensions'
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;
  return query
  select u.login_id, u.role, u.must_change_password, u.updated_at, u.name, u.phone, u.email, u.hidden
  from public.app_users u
  order by u.role, u.login_id;
end;
$$;

create or replace function public.admin_set_user_hidden(
  p_admin_user_id uuid, p_login_id text, p_hidden boolean
)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;
  update public.app_users set hidden = coalesce(p_hidden, false), updated_at = now()
  where login_id = p_login_id and role <> 'admin';
  return found;
end;
$$;

grant execute on function public.admin_list_users(uuid) to anon;
grant execute on function public.admin_set_user_hidden(uuid, text, boolean) to anon;

-- Read-only rubric + heading for the student/mentor Guidelines page.
create or replace function public.get_judging_rubric()
returns table (report_heading text, rubric jsonb)
language sql security definer set search_path = public
as $$
  select report_heading, rubric from public.judging_settings where id = 1;
$$;

grant execute on function public.get_judging_rubric() to anon;
