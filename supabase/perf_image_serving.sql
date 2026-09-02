-- Performance: stop shipping base64 images inside page payloads.
--
-- Team logos and mentor avatars are stored as base64 `data:` URIs in
-- app_users (measured: 1.68 MB of logos across 48 teams, 1.63 MB of avatars
-- across 34 mentors). Every list RPC returned them in full, so the server
-- inlined ~3.3 MB of image *text* into the HTML/RSC payload of /showcase and
-- /mentors — uncacheable, and re-downloaded on every navigation. Measured
-- before/after: /showcase 3.80 MB -> 414 KB, /mentors 3.46 MB -> 287 KB.
--
-- The bytes stay in Postgres. The list RPCs now return an 8-char md5 prefix
-- of the image (null when there is none) and the app turns that into
-- "/api/img/<kind>/<login_id>?v=<version>", served by a route handler with
-- immutable cache headers (see lib/image-response.ts). Because the version
-- changes whenever the image does, the URL busts its own cache.
--
-- get_public_showcase_teams additionally stops returning problem_statement
-- and solution_long — the showcase grid card never renders them; only the
-- detail page does, and that has its own single-row RPC.
--
-- Already applied to the project via the Supabase MCP; kept here for
-- reference / reruns elsewhere.

-- ---------------------------------------------------------------------
-- Narrow single-row readers backing /api/img/*
-- ---------------------------------------------------------------------

create or replace function public.get_team_logo_by_login(p_login_id text)
returns text
language sql stable security definer set search_path = public
as $$
  select team_logo_url from public.app_users
  where login_id = p_login_id and role = 'member' and hidden is not true;
$$;

create or replace function public.get_mentor_avatar_by_login(p_login_id text)
returns text
language sql stable security definer set search_path = public
as $$
  select avatar_url from public.app_users
  where login_id = p_login_id and role = 'mentor' and hidden is not true;
$$;

-- ---------------------------------------------------------------------
-- Public showcase
-- ---------------------------------------------------------------------

drop function if exists public.get_public_showcase_teams();
create function public.get_public_showcase_teams()
returns table (
  student_user_id uuid, login_id text, team_name text, team_lead_name text,
  team_logo_version text, domain_id text, project_title text,
  solution_short text, member_names text[], mentor_name text
)
language sql security definer set search_path to 'public'
as $$
  select u.id, u.login_id, u.name, u.team_lead_name,
    left(md5(u.team_logo_url), 8), ds.domain_id, u.project_title,
    u.solution_short,
    coalesce((select array_agg(tm.name order by tm.sort_order, tm.created_at)
      from public.team_members tm where tm.student_user_id = u.id), '{}'::text[]),
    (select mu.name from public.mentor_assignments ma
     join public.app_users mu on mu.id = ma.mentor_user_id
     where ma.student_user_id = u.id)
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  where u.role = 'member' and u.hidden is not true
  order by u.login_id;
$$;

drop function if exists public.get_public_showcase_team(text);
create function public.get_public_showcase_team(p_login_id text)
returns table (
  student_user_id uuid, login_id text, team_name text, team_lead_name text,
  team_logo_version text, domain_id text, project_title text,
  problem_statement text, solution_short text, solution_long text,
  member_names text[], mentor_name text
)
language sql security definer set search_path to 'public'
as $$
  select u.id, u.login_id, u.name, u.team_lead_name,
    left(md5(u.team_logo_url), 8), ds.domain_id, u.project_title,
    u.problem_statement, u.solution_short, u.solution_long,
    coalesce((select array_agg(tm.name order by tm.sort_order, tm.created_at)
      from public.team_members tm where tm.student_user_id = u.id), '{}'::text[]),
    (select mu.name from public.mentor_assignments ma
     join public.app_users mu on mu.id = ma.mentor_user_id
     where ma.student_user_id = u.id)
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  where u.role = 'member' and u.hidden is not true and u.login_id = p_login_id;
$$;

drop function if exists public.get_public_mentor_showcase();
create function public.get_public_mentor_showcase()
returns table (
  mentor_user_id uuid, login_id text, name text,
  avatar_version text, bio text, domain_ids text[]
)
language sql security definer set search_path to 'public'
as $$
  select u.id, u.login_id, u.name, left(md5(u.avatar_url), 8), u.bio,
    coalesce((select array_agg(ds.domain_id order by ds.created_at)
      from public.domain_selections ds
      where ds.user_id = u.id and ds.role = 'mentor'), '{}'::text[])
  from public.app_users u
  where u.role = 'mentor' and u.hidden is not true
  order by u.login_id;
$$;

-- ---------------------------------------------------------------------
-- Admin directories + mentor "My Teams"
-- ---------------------------------------------------------------------

drop function if exists public.admin_list_team_profiles(uuid);
create function public.admin_list_team_profiles(p_admin_user_id uuid)
returns table (
  student_user_id uuid, login_id text, team_name text, team_lead_name text,
  team_logo_version text, venue text, domain_id text, project_title text,
  problem_statement text, solution_short text, solution_long text,
  member_count integer, mentor_user_id uuid, mentor_name text, mentor_login_id text,
  submission_canva_url text, submission_file_url text, submission_file_name text,
  submission_updated_at timestamptz
)
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;
  return query
  select u.id, u.login_id, u.name, u.team_lead_name,
    left(md5(u.team_logo_url), 8), coalesce(u.venue, m.venue), ds.domain_id,
    u.project_title, u.problem_statement, u.solution_short, u.solution_long,
    coalesce((select count(*) from public.team_members tm where tm.student_user_id = u.id), 0)::integer,
    m.id, m.name, m.login_id,
    u.submission_canva_url, u.submission_file_url, u.submission_file_name, u.submission_updated_at
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  left join public.mentor_assignments ma on ma.student_user_id = u.id
  left join public.app_users m on m.id = ma.mentor_user_id
  where u.role = 'member' and u.hidden is not true
  order by u.login_id;
end;
$$;

drop function if exists public.admin_list_mentor_profiles(uuid);
create function public.admin_list_mentor_profiles(p_admin_user_id uuid)
returns table (
  mentor_user_id uuid, login_id text, name text,
  avatar_version text, bio text, venue text, domain_ids text[]
)
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;
  return query
  select u.id, u.login_id, u.name, left(md5(u.avatar_url), 8), u.bio, u.venue,
    coalesce((select array_agg(ds.domain_id order by ds.created_at)
      from public.domain_selections ds
      where ds.user_id = u.id and ds.role = 'mentor'), '{}'::text[])
  from public.app_users u
  where u.role = 'mentor' and u.hidden is not true
  order by u.login_id;
end;
$$;

drop function if exists public.get_my_teams(uuid);
create function public.get_my_teams(p_mentor_user_id uuid)
returns table (
  student_user_id uuid, login_id text, team_name text, team_lead_name text,
  team_logo_version text, domain_id text, venue text, project_title text,
  problem_statement text, solution_short text, solution_long text,
  member_count integer,
  submission_canva_url text, submission_file_url text, submission_file_name text,
  submission_updated_at timestamptz
)
language sql security definer set search_path to 'public'
as $$
  select a.id, a.login_id, a.name, a.team_lead_name,
         left(md5(a.team_logo_url), 8),
         ds.domain_id, a.venue, a.project_title, a.problem_statement,
         a.solution_short, a.solution_long,
         coalesce((select count(*) from public.team_members tm where tm.student_user_id = a.id), 0)::integer,
         a.submission_canva_url, a.submission_file_url, a.submission_file_name,
         a.submission_updated_at
  from public.mentor_assignments ma
  join public.app_users a on a.id = ma.student_user_id
  left join public.domain_selections ds on ds.user_id = a.id and ds.role = 'member'
  where ma.mentor_user_id = p_mentor_user_id and a.hidden is not true
  order by a.name;
$$;

drop function if exists public.get_my_mentor(uuid);
create function public.get_my_mentor(p_student_user_id uuid)
returns table (mentor_user_id uuid, name text, login_id text, avatar_version text, bio text)
language sql security definer set search_path = public
as $$
  select a.id, a.name, a.login_id, left(md5(a.avatar_url), 8), a.bio
  from public.mentor_assignments ma
  join public.app_users a on a.id = ma.mentor_user_id
  where ma.student_user_id = p_student_user_id;
$$;

-- ---------------------------------------------------------------------
-- Single-row detail readers
--
-- The admin team-profile and mentor-profile detail pages used to call the
-- full directory RPC and then list.find(id) in JS — fetching 62 (or 34) rows
-- to render one. (The mentor-side team detail still uses get_my_teams: that
-- already returns only that mentor's own <=2 teams.)
-- ---------------------------------------------------------------------

create or replace function public.admin_get_team_profile(
  p_admin_user_id uuid, p_student_user_id uuid
)
returns table (
  student_user_id uuid, login_id text, team_name text, team_lead_name text,
  team_logo_version text, venue text, domain_id text, project_title text,
  problem_statement text, solution_short text, solution_long text,
  member_count integer, mentor_user_id uuid, mentor_name text, mentor_login_id text,
  submission_canva_url text, submission_file_url text, submission_file_name text,
  submission_updated_at timestamptz
)
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;
  return query
  select u.id, u.login_id, u.name, u.team_lead_name,
    left(md5(u.team_logo_url), 8), coalesce(u.venue, m.venue), ds.domain_id,
    u.project_title, u.problem_statement, u.solution_short, u.solution_long,
    coalesce((select count(*) from public.team_members tm where tm.student_user_id = u.id), 0)::integer,
    m.id, m.name, m.login_id,
    u.submission_canva_url, u.submission_file_url, u.submission_file_name, u.submission_updated_at
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  left join public.mentor_assignments ma on ma.student_user_id = u.id
  left join public.app_users m on m.id = ma.mentor_user_id
  where u.role = 'member' and u.hidden is not true and u.id = p_student_user_id;
end;
$$;

create or replace function public.admin_get_mentor_profile(
  p_admin_user_id uuid, p_mentor_user_id uuid
)
returns table (
  mentor_user_id uuid, login_id text, name text,
  avatar_version text, bio text, venue text, domain_ids text[]
)
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;
  return query
  select u.id, u.login_id, u.name, left(md5(u.avatar_url), 8), u.bio, u.venue,
    coalesce((select array_agg(ds.domain_id order by ds.created_at)
      from public.domain_selections ds
      where ds.user_id = u.id and ds.role = 'mentor'), '{}'::text[])
  from public.app_users u
  where u.role = 'mentor' and u.hidden is not true and u.id = p_mentor_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- login: was `select * into matched` (a full app_users%rowtype), which
-- dragged avatar_url and team_logo_url — 2 MB-capable base64 columns — into
-- memory on every sign-in just to return five scalars.
-- ---------------------------------------------------------------------

create or replace function public.login(
  p_login_id text, p_password text, p_name text default null::text
)
returns table (user_id uuid, role text, must_change_password boolean, name text, email text)
language plpgsql security definer set search_path to 'public'
as $$
begin
  return query
  select u.id, u.role, u.must_change_password, u.name, u.email
  from public.app_users u
  where u.login_id = p_login_id
    and u.password_hash = extensions.crypt(p_password, u.password_hash);
end;
$$;

-- ---------------------------------------------------------------------
-- Indexes for the predicates these RPCs filter on. Not the bottleneck at
-- ~100 users (payload size was), but cheap and they keep the plans flat.
-- ---------------------------------------------------------------------

-- Capacity counts and get_domain_counts filter on (domain_id, role); the
-- existing unique index leads with user_id and cannot serve them. The count
-- in select_domain runs inside an advisory lock, so it serializes.
create index if not exists domain_selections_domain_role_idx
  on public.domain_selections (domain_id, role);

create index if not exists app_users_role_idx
  on public.app_users (role);

create index if not exists app_users_member_venue_idx
  on public.app_users (venue) where role = 'member';

-- Unindexed FK flagged by the Supabase performance advisor.
create index if not exists judging_venue_assignments_venue_idx
  on public.judging_venue_assignments (judging_venue_id);

-- ---------------------------------------------------------------------
-- Security: guideline_settings was the only table with RLS disabled, so the
-- public anon key could read/write it directly — including file_data, the
-- 15 MB-capable base64 deck. All access already goes through security-definer
-- RPCs, which bypass RLS, so enabling it matches every other table here.
-- ---------------------------------------------------------------------

alter table public.guideline_settings enable row level security;

grant execute on function public.get_team_logo_by_login(text) to anon;
grant execute on function public.get_mentor_avatar_by_login(text) to anon;
grant execute on function public.get_public_showcase_teams() to anon;
grant execute on function public.get_public_showcase_team(text) to anon;
grant execute on function public.get_public_mentor_showcase() to anon;
grant execute on function public.admin_list_team_profiles(uuid) to anon;
grant execute on function public.admin_list_mentor_profiles(uuid) to anon;
grant execute on function public.get_my_teams(uuid) to anon;
grant execute on function public.get_my_mentor(uuid) to anon;
grant execute on function public.admin_get_team_profile(uuid, uuid) to anon;
grant execute on function public.admin_get_mentor_profile(uuid, uuid) to anon;
grant execute on function public.login(text, text, text) to anon;
