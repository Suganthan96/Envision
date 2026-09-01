-- Team logo (student side, same data: URI pattern as the mentor avatar) and
-- a mentor-facing "my teams" roster view. Already applied to the project via
-- the Supabase MCP; kept here for reference / reruns elsewhere.

alter table public.app_users
  add column if not exists team_logo_url text;

alter table public.app_users
  drop constraint if exists app_users_team_logo_url_length_check;
alter table public.app_users
  add constraint app_users_team_logo_url_length_check
  check (team_logo_url is null or length(team_logo_url) <= 2000000);

create or replace function public.get_team_logo(p_user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select team_logo_url from public.app_users where id = p_user_id;
$$;

create or replace function public.update_team_logo(
  p_user_id uuid,
  p_logo_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_logo_url is not null and length(p_logo_url) > 2000000 then
    raise exception 'Logo is too large';
  end if;

  update public.app_users
  set team_logo_url = p_logo_url,
      updated_at = now()
  where id = p_user_id and role = 'member';

  return found;
end;
$$;

create or replace function public.get_my_teams(p_mentor_user_id uuid)
returns table (
  student_user_id uuid,
  login_id text,
  team_name text,
  team_lead_name text,
  team_logo_url text,
  domain_id text,
  venue text
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.login_id, a.name, a.team_lead_name, a.team_logo_url,
         ds.domain_id, a.venue
  from public.mentor_assignments ma
  join public.app_users a on a.id = ma.student_user_id
  left join public.domain_selections ds on ds.user_id = a.id and ds.role = 'member'
  where ma.mentor_user_id = p_mentor_user_id
  order by a.name;
$$;

grant execute on function public.get_team_logo(uuid) to anon;
grant execute on function public.update_team_logo(uuid, text) to anon;
grant execute on function public.get_my_teams(uuid) to anon;
