-- Judging / presentation venues for the admin Submissions page. Separate
-- from the allocation venues in `public.venues` (mentor matching): this is
-- where a team presents to judges, managed independently here (add / rename
-- / delete). A team's presentation venue is a LAYERED override:
--     team assignment  ->  its mentor's assignment  ->  its theme's assignment
--
-- judging_settings is one row holding the customisable PDF report heading
-- and the rubric rows ({label, max}). The Submissions page renders a rubric
-- editor + heading field over it, and the PDF export (jspdf) groups teams by
-- resolved venue, one venue per page, with the heading + venue in the header.
--
-- Already applied to the project via the Supabase MCP; kept here for
-- reference / reruns elsewhere.

create table if not exists public.judging_venues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.judging_venues enable row level security;

create table if not exists public.judging_venue_assignments (
  scope text not null check (scope in ('team', 'mentor', 'theme')),
  ref_id text not null,   -- student/mentor uuid as text, or domain_id for 'theme'
  judging_venue_id uuid not null references public.judging_venues(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (scope, ref_id)
);
alter table public.judging_venue_assignments enable row level security;

create table if not exists public.judging_settings (
  id integer primary key default 1 check (id = 1),
  report_heading text not null default 'EnVision 2026 - Judging Sheet',
  rubric jsonb not null default '[
    {"label": "Background Study", "max": 10},
    {"label": "Problem Statement", "max": 15},
    {"label": "User Identification", "max": 10},
    {"label": "Solution", "max": 5},
    {"label": "Team work and presentation", "max": 10}
  ]'::jsonb,
  faculty_heading text not null default 'EnVision 2026 - Faculty Schedule',
  faculty_timing text not null default '2:00 PM - 4:00 PM',
  updated_at timestamptz not null default now()
);
alter table public.judging_settings enable row level security;
insert into public.judging_settings (id) values (1) on conflict (id) do nothing;

create or replace function public._require_admin(p_admin_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;
end;
$$;

create or replace function public.admin_list_judging_venues(p_admin_user_id uuid)
returns setof public.judging_venues
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  return query select * from public.judging_venues order by sort_order, name;
end;
$$;

create or replace function public.admin_add_judging_venue(p_admin_user_id uuid, p_name text)
returns public.judging_venues
language plpgsql security definer set search_path = public as $$
declare v_row public.judging_venues;
begin
  perform public._require_admin(p_admin_user_id);
  if coalesce(btrim(p_name), '') = '' then raise exception 'Venue name is required'; end if;
  insert into public.judging_venues (name, sort_order)
  values (btrim(p_name), coalesce((select max(sort_order) + 1 from public.judging_venues), 0))
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.admin_rename_judging_venue(p_admin_user_id uuid, p_id uuid, p_name text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  if coalesce(btrim(p_name), '') = '' then raise exception 'Venue name is required'; end if;
  update public.judging_venues set name = btrim(p_name) where id = p_id;
  return found;
end;
$$;

create or replace function public.admin_delete_judging_venue(p_admin_user_id uuid, p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  delete from public.judging_venues where id = p_id;
  return found;
end;
$$;

create or replace function public.admin_list_judging_assignments(p_admin_user_id uuid)
returns setof public.judging_venue_assignments
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  return query select * from public.judging_venue_assignments;
end;
$$;

create or replace function public.admin_set_judging_assignment(
  p_admin_user_id uuid, p_scope text, p_ref_id text, p_venue_id uuid
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  if p_scope not in ('team', 'mentor', 'theme') then raise exception 'Invalid scope'; end if;
  if p_venue_id is null then
    delete from public.judging_venue_assignments where scope = p_scope and ref_id = p_ref_id;
  else
    insert into public.judging_venue_assignments (scope, ref_id, judging_venue_id, updated_at)
    values (p_scope, p_ref_id, p_venue_id, now())
    on conflict (scope, ref_id)
    do update set judging_venue_id = excluded.judging_venue_id, updated_at = now();
  end if;
  return true;
end;
$$;

create or replace function public.admin_get_judging_settings(p_admin_user_id uuid)
returns public.judging_settings
language plpgsql security definer set search_path = public as $$
declare v_row public.judging_settings;
begin
  perform public._require_admin(p_admin_user_id);
  select * into v_row from public.judging_settings where id = 1;
  return v_row;
end;
$$;

drop function if exists public.admin_set_judging_settings(uuid, text, jsonb);
create function public.admin_set_judging_settings(
  p_admin_user_id uuid, p_heading text, p_rubric jsonb,
  p_faculty_heading text, p_faculty_timing text
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  if coalesce(btrim(p_heading), '') = '' then raise exception 'Report heading is required'; end if;
  if jsonb_typeof(p_rubric) <> 'array' then raise exception 'Rubric must be an array'; end if;
  update public.judging_settings
  set report_heading = btrim(p_heading),
      rubric = p_rubric,
      faculty_heading = coalesce(nullif(btrim(p_faculty_heading), ''), faculty_heading),
      faculty_timing = coalesce(nullif(btrim(p_faculty_timing), ''), faculty_timing),
      updated_at = now()
  where id = 1;
  return true;
end;
$$;

grant execute on function public.admin_list_judging_venues(uuid) to anon;
grant execute on function public.admin_add_judging_venue(uuid, text) to anon;
grant execute on function public.admin_rename_judging_venue(uuid, uuid, text) to anon;
grant execute on function public.admin_delete_judging_venue(uuid, uuid) to anon;
grant execute on function public.admin_list_judging_assignments(uuid) to anon;
grant execute on function public.admin_set_judging_assignment(uuid, text, text, uuid) to anon;
grant execute on function public.admin_get_judging_settings(uuid) to anon;
grant execute on function public.admin_set_judging_settings(uuid, text, jsonb, text, text) to anon;

-- admin_list_submissions also gained team_lead_name, project_title,
-- mentor_user_id here (canonical body in team_submission.sql).

-- ==========================================================================
-- ADDENDUM: two venue kinds — 'judging' (present in) and 'waiting' (wait in).
-- Existing rows default to 'judging'. Applied via Supabase MCP.
-- ==========================================================================

alter table public.judging_venues
  add column if not exists kind text not null default 'judging'
  check (kind in ('judging', 'waiting'));
alter table public.judging_venues drop constraint if exists judging_venues_name_key;
alter table public.judging_venues add constraint judging_venues_kind_name_key unique (kind, name);

alter table public.judging_venue_assignments
  add column if not exists kind text not null default 'judging'
  check (kind in ('judging', 'waiting'));
alter table public.judging_venue_assignments drop constraint if exists judging_venue_assignments_pkey;
alter table public.judging_venue_assignments
  add constraint judging_venue_assignments_pkey primary key (kind, scope, ref_id);

create or replace function public.admin_list_judging_venues(p_admin_user_id uuid, p_kind text default 'judging')
returns setof public.judging_venues
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  return query select * from public.judging_venues where kind = p_kind order by sort_order, name;
end;
$$;

drop function if exists public.admin_add_judging_venue(uuid, text);
create function public.admin_add_judging_venue(p_admin_user_id uuid, p_name text, p_kind text default 'judging')
returns public.judging_venues
language plpgsql security definer set search_path = public as $$
declare v_row public.judging_venues;
begin
  perform public._require_admin(p_admin_user_id);
  if p_kind not in ('judging', 'waiting') then raise exception 'Invalid kind'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'Venue name is required'; end if;
  insert into public.judging_venues (name, kind, sort_order)
  values (btrim(p_name), p_kind,
          coalesce((select max(sort_order) + 1 from public.judging_venues where kind = p_kind), 0))
  returning * into v_row;
  return v_row;
end;
$$;

drop function if exists public.admin_set_judging_assignment(uuid, text, text, uuid);
create function public.admin_set_judging_assignment(
  p_admin_user_id uuid, p_scope text, p_ref_id text, p_venue_id uuid, p_kind text default 'judging'
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  if p_scope not in ('team', 'mentor', 'theme') then raise exception 'Invalid scope'; end if;
  if p_kind not in ('judging', 'waiting') then raise exception 'Invalid kind'; end if;
  if p_venue_id is null then
    delete from public.judging_venue_assignments
    where kind = p_kind and scope = p_scope and ref_id = p_ref_id;
  else
    insert into public.judging_venue_assignments (kind, scope, ref_id, judging_venue_id, updated_at)
    values (p_kind, p_scope, p_ref_id, p_venue_id, now())
    on conflict (kind, scope, ref_id)
    do update set judging_venue_id = excluded.judging_venue_id, updated_at = now();
  end if;
  return true;
end;
$$;

grant execute on function public.admin_list_judging_venues(uuid, text) to anon;
grant execute on function public.admin_add_judging_venue(uuid, text, text) to anon;
grant execute on function public.admin_set_judging_assignment(uuid, text, text, uuid, text) to anon;
