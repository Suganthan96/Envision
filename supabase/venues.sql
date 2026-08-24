-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Replaces the hardcoded 'C20'/'G01' venue list (a one-off CHECK
-- constraint on app_users.venue) with an admin-managed venues table —
-- add/remove venues and set each venue's team capacity from the Mentor
-- Matching page. admin_set_venue now validates against this table and
-- enforces the team capacity when assigning a venue to a student team
-- (mentors aren't capacity-limited per venue, only teams are, per the
-- "23 teams in C20 / 40 teams in G01" requirement).

create table if not exists public.venues (
  code text primary key,
  team_capacity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.venues (code, team_capacity) values ('C20', 23), ('G01', 40)
on conflict (code) do nothing;

alter table public.venues enable row level security;
-- No policies on purpose: only reachable through the security definer
-- RPCs below, never directly via the anon key.

alter table public.app_users drop constraint if exists app_users_venue_check;

create or replace function public.get_venues()
returns table (code text, team_capacity integer, team_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    v.code,
    v.team_capacity,
    coalesce((select count(*) from public.app_users u where u.role = 'member' and u.venue = v.code), 0)
  from public.venues v
  order by v.code;
$$;

create or replace function public.admin_add_venue(
  p_admin_user_id uuid,
  p_code text,
  p_team_capacity integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if v_code = '' then
    raise exception 'A venue code is required';
  end if;

  if p_team_capacity is null or p_team_capacity < 0 then
    raise exception 'Capacity must be zero or greater';
  end if;

  insert into public.venues (code, team_capacity) values (v_code, p_team_capacity);
  return true;
end;
$$;

create or replace function public.admin_remove_venue(
  p_admin_user_id uuid,
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  update public.app_users set venue = null where venue = p_code;
  delete from public.venues where code = p_code;
  return found;
end;
$$;

create or replace function public.admin_set_venue_capacity(
  p_admin_user_id uuid,
  p_code text,
  p_team_capacity integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if p_team_capacity is null or p_team_capacity < 0 then
    raise exception 'Capacity must be zero or greater';
  end if;

  update public.venues set team_capacity = p_team_capacity, updated_at = now() where code = p_code;
  return found;
end;
$$;

create or replace function public.admin_set_venue(
  p_admin_user_id uuid,
  p_user_id uuid,
  p_venue text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_capacity integer;
  v_count integer;
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  select role into v_role from public.app_users where id = p_user_id;
  if v_role not in ('mentor', 'member') then
    raise exception 'Not a mentor or student team';
  end if;

  if p_venue is not null then
    select team_capacity into v_capacity from public.venues where code = p_venue;
    if v_capacity is null then
      raise exception 'Unknown venue';
    end if;

    if v_role = 'member' then
      select count(*) into v_count
      from public.app_users u
      where u.role = 'member' and u.venue = p_venue and u.id <> p_user_id;

      if v_count >= v_capacity then
        raise exception 'This venue is already at capacity';
      end if;
    end if;
  end if;

  update public.app_users
  set venue = p_venue,
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

grant execute on function public.get_venues() to anon;
grant execute on function public.admin_add_venue(uuid, text, integer) to anon;
grant execute on function public.admin_remove_venue(uuid, text) to anon;
grant execute on function public.admin_set_venue_capacity(uuid, text, integer) to anon;
grant execute on function public.admin_set_venue(uuid, uuid, text) to anon;
