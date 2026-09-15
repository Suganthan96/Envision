-- Rubric presets + faculty / external-jury evaluators.
--
-- Two things live here:
--
-- 1. RUBRIC PRESETS. The event is judged in rounds — the immediate evaluation
--    uses one set of criteria, the final another. `rubric_presets` holds them
--    all; exactly one is active at a time (partial unique index), and the
--    active one is what students see on Guidelines, what the judging-sheet PDF
--    prints, and what every evaluator marks against. `judging_settings.rubric`
--    is kept in lockstep with the active preset so every existing read path
--    (PDFs, get_judging_rubric, the admin scores page) follows the switch with
--    no change of its own.
--
-- 2. EVALUATORS. Two new roles, 'faculty' and 'jury' (external), each with its
--    own login. An evaluator marks the teams presenting in the venue(s) the
--    admin assigns them, plus any individual teams the admin adds as a
--    temporary extra. Marks are per evaluator — nobody overwrites anyone — and
--    the admin sees every sheet plus the per-criterion average.
--
--     rubric_presets      the rounds, one active
--     evaluations         (preset, evaluator, team) -> marks + derived total
--     evaluator_venues    which rooms an evaluator covers
--     evaluator_teams     admin's per-team overrides on top of the rooms

-- ---------------------------------------------------------------- roles ----

alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users add constraint app_users_role_check
  check (role = any (array['member', 'mentor', 'admin', 'faculty', 'jury']));

-- --------------------------------------------------------------- presets ----

create table if not exists public.rubric_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rubric jsonb not null,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.rubric_presets enable row level security;

-- At most one active preset, enforced by the database rather than by whoever
-- remembers to clear the old one.
create unique index if not exists rubric_presets_one_active
  on public.rubric_presets ((is_active)) where is_active;

-- Seed: the rubric currently in judging_settings becomes the active round,
-- with a second round ready to be edited for the finals.
insert into public.rubric_presets (name, rubric, is_active, sort_order)
select 'Immediate Evaluation', s.rubric, true, 0 from public.judging_settings s where s.id = 1
on conflict (name) do nothing;

insert into public.rubric_presets (name, rubric, is_active, sort_order)
select 'Final Evaluation', s.rubric, false, 1 from public.judging_settings s where s.id = 1
on conflict (name) do nothing;

-- ----------------------------------------------------------- evaluations ----

create table if not exists public.evaluations (
  preset_id uuid not null references public.rubric_presets(id) on delete cascade,
  evaluator_user_id uuid not null references public.app_users(id) on delete cascade,
  student_user_id uuid not null references public.app_users(id) on delete cascade,
  marks jsonb not null,
  total numeric(6,2) not null,
  updated_at timestamptz not null default now(),
  primary key (preset_id, evaluator_user_id, student_user_id)
);
alter table public.evaluations enable row level security;
create index if not exists evaluations_by_team on public.evaluations (preset_id, student_user_id);

create table if not exists public.evaluator_venues (
  evaluator_user_id uuid not null references public.app_users(id) on delete cascade,
  judging_venue_id uuid not null references public.judging_venues(id) on delete cascade,
  primary key (evaluator_user_id, judging_venue_id)
);
alter table public.evaluator_venues enable row level security;

-- Individual teams an evaluator can mark on top of their rooms — the admin's
-- escape hatch when someone has to cover a team from elsewhere.
create table if not exists public.evaluator_teams (
  evaluator_user_id uuid not null references public.app_users(id) on delete cascade,
  student_user_id uuid not null references public.app_users(id) on delete cascade,
  primary key (evaluator_user_id, student_user_id)
);
alter table public.evaluator_teams enable row level security;

-- --------------------------------------------------------------- helpers ----

create or replace function public._require_evaluator(p_user_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  select role into v_role from public.app_users where id = p_user_id;
  if v_role is null or v_role not in ('faculty', 'jury', 'admin') then
    raise exception 'Not authorized';
  end if;
  return v_role;
end;
$$;

-- The same layered resolution the UI does: the team's own judging venue wins,
-- then its mentor's, then its theme's.
create or replace function public._team_judging_venue(p_student_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select a.judging_venue_id from public.judging_venue_assignments a
      where a.kind = 'judging' and a.scope = 'team' and a.ref_id = p_student_user_id::text),
    (select a.judging_venue_id from public.judging_venue_assignments a
      join public.mentor_assignments ma on ma.mentor_user_id::text = a.ref_id
      where a.kind = 'judging' and a.scope = 'mentor' and ma.student_user_id = p_student_user_id),
    (select a.judging_venue_id from public.judging_venue_assignments a
      join public.domain_selections ds on ds.domain_id = a.ref_id and ds.role = 'member'
      where a.kind = 'judging' and a.scope = 'theme' and ds.user_id = p_student_user_id)
  );
$$;

create or replace function public._active_preset()
returns public.rubric_presets language sql stable security definer set search_path = public as $$
  select * from public.rubric_presets where is_active order by sort_order limit 1;
$$;

-- Clamp every mark to its criterion's maximum and reject anything that isn't a
-- number, so a total can never exceed the rubric no matter what posts to it.
create or replace function public._clean_marks(p_rubric jsonb, p_marks jsonb)
returns jsonb language plpgsql immutable as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_row jsonb;
  v_label text;
  v_max numeric;
  v_val jsonb;
begin
  if p_marks is null or jsonb_typeof(p_marks) <> 'object' then return '{}'::jsonb; end if;
  for v_row in select * from jsonb_array_elements(p_rubric) loop
    v_label := v_row ->> 'label';
    v_max := coalesce((v_row ->> 'max')::numeric, 0);
    v_val := p_marks -> v_label;
    if v_val is null or jsonb_typeof(v_val) = 'null' then continue; end if;
    if jsonb_typeof(v_val) <> 'number' then
      raise exception 'Mark for "%" must be a number', v_label;
    end if;
    if (v_val)::numeric < 0 then
      raise exception 'Mark for "%" cannot be negative', v_label;
    end if;
    v_out := v_out || jsonb_build_object(v_label, least((v_val)::numeric, v_max));
  end loop;
  return v_out;
end;
$$;

-- -------------------------------------------------------- preset admin -----

create or replace function public.admin_list_rubric_presets(p_admin_user_id uuid)
returns table (
  id uuid, name text, rubric jsonb, is_active boolean, sort_order integer,
  evaluation_count bigint
)
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  return query
  select p.id, p.name, p.rubric, p.is_active, p.sort_order,
    (select count(*) from public.evaluations e where e.preset_id = p.id)
  from public.rubric_presets p
  order by p.sort_order, p.created_at;
end;
$$;

create or replace function public.admin_save_rubric_preset(
  p_admin_user_id uuid,
  p_id uuid,
  p_name text,
  p_rubric jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public._require_admin(p_admin_user_id);
  if coalesce(btrim(p_name), '') = '' then raise exception 'A preset name is required'; end if;
  if jsonb_typeof(p_rubric) <> 'array' or jsonb_array_length(p_rubric) = 0 then
    raise exception 'Add at least one criterion';
  end if;

  if p_id is null then
    insert into public.rubric_presets (name, rubric, sort_order)
    values (btrim(p_name), p_rubric,
      coalesce((select max(sort_order) + 1 from public.rubric_presets), 0))
    returning id into v_id;
  else
    update public.rubric_presets
    set name = btrim(p_name), rubric = p_rubric, updated_at = now()
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'That preset no longer exists'; end if;
  end if;

  -- Editing the live round has to reach everything that reads the rubric.
  update public.judging_settings s
  set rubric = p_rubric, updated_at = now()
  where s.id = 1 and exists (
    select 1 from public.rubric_presets p where p.id = v_id and p.is_active
  );

  return v_id;
end;
$$;

create or replace function public.admin_activate_rubric_preset(p_admin_user_id uuid, p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_rubric jsonb;
begin
  perform public._require_admin(p_admin_user_id);
  select rubric into v_rubric from public.rubric_presets where id = p_id;
  if v_rubric is null then raise exception 'That preset no longer exists'; end if;

  update public.rubric_presets set is_active = false where is_active and id <> p_id;
  update public.rubric_presets set is_active = true, updated_at = now() where id = p_id;
  update public.judging_settings set rubric = v_rubric, updated_at = now() where id = 1;
  return true;
end;
$$;

create or replace function public.admin_delete_rubric_preset(p_admin_user_id uuid, p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  if exists (select 1 from public.rubric_presets where id = p_id and is_active) then
    raise exception 'Activate another round before deleting this one';
  end if;
  delete from public.rubric_presets where id = p_id;
  return true;
end;
$$;

-- The rubric students, mentors and evaluators see: always the active round.
create or replace function public.get_active_rubric()
returns table (preset_id uuid, preset_name text, rubric jsonb)
language sql security definer set search_path = public as $$
  select id, name, rubric from public.rubric_presets where is_active order by sort_order limit 1;
$$;

-- Follows the active preset rather than its own stale copy.
create or replace function public.get_judging_rubric()
returns table (report_heading text, rubric jsonb)
language sql security definer set search_path = public as $$
  select s.report_heading, coalesce(p.rubric, s.rubric)
  from public.judging_settings s
  left join lateral (
    select rubric from public.rubric_presets where is_active order by sort_order limit 1
  ) p on true
  where s.id = 1;
$$;

grant execute on function public.get_active_rubric() to anon;
grant execute on function public.get_judging_rubric() to anon;
grant execute on function public.admin_list_rubric_presets(uuid) to anon;
grant execute on function public.admin_save_rubric_preset(uuid, uuid, text, jsonb) to anon;
grant execute on function public.admin_activate_rubric_preset(uuid, uuid) to anon;
grant execute on function public.admin_delete_rubric_preset(uuid, uuid) to anon;

-- ------------------------------------------------------ evaluator portal ----

-- The teams one evaluator may mark: everyone presenting in their rooms, plus
-- the individual teams the admin has added for them. Carries that evaluator's
-- own marks for the active round — never anyone else's.
create or replace function public.evaluator_list_teams(p_user_id uuid)
returns table (
  student_user_id uuid,
  login_id text,
  team_name text,
  project_title text,
  domain_id text,
  mentor_name text,
  venue_name text,
  is_extra boolean,
  marks jsonb,
  total numeric
)
language plpgsql security definer set search_path = public as $$
declare v_preset uuid;
begin
  perform public._require_evaluator(p_user_id);
  select id into v_preset from public.rubric_presets where is_active order by sort_order limit 1;

  return query
  with scoped as (
    select u.id, public._team_judging_venue(u.id) as venue_id,
      exists (select 1 from public.evaluator_teams t
              where t.evaluator_user_id = p_user_id and t.student_user_id = u.id) as extra
    from public.app_users u
    where u.role = 'member' and u.hidden is not true
  )
  select u.id, u.login_id, u.name, u.project_title, ds.domain_id, m.name,
    v.name, s.extra,
    coalesce(e.marks, '{}'::jsonb), e.total
  from scoped s
  join public.app_users u on u.id = s.id
  left join public.judging_venues v on v.id = s.venue_id
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  left join public.mentor_assignments ma on ma.student_user_id = u.id
  left join public.app_users m on m.id = ma.mentor_user_id
  left join public.evaluations e
    on e.preset_id = v_preset and e.evaluator_user_id = p_user_id and e.student_user_id = u.id
  where s.extra
     or exists (select 1 from public.evaluator_venues ev
                where ev.evaluator_user_id = p_user_id and ev.judging_venue_id = s.venue_id)
  order by u.login_id;
end;
$$;

-- An evaluator's own marks for one team, against the active round only. An
-- empty object clears them. Visibility is re-checked here, not trusted from
-- the client.
create or replace function public.evaluator_set_marks(
  p_user_id uuid,
  p_student_user_id uuid,
  p_marks jsonb
)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_preset public.rubric_presets;
  v_clean jsonb;
  v_total numeric;
begin
  perform public._require_evaluator(p_user_id);
  v_preset := public._active_preset();
  if v_preset.id is null then raise exception 'No evaluation round is active'; end if;

  if not exists (
    select 1 from public.evaluator_teams t
    where t.evaluator_user_id = p_user_id and t.student_user_id = p_student_user_id
    union all
    select 1 from public.evaluator_venues ev
    where ev.evaluator_user_id = p_user_id
      and ev.judging_venue_id = public._team_judging_venue(p_student_user_id)
  ) then
    raise exception 'That team is not assigned to you';
  end if;

  v_clean := public._clean_marks(v_preset.rubric, p_marks);

  if v_clean = '{}'::jsonb then
    delete from public.evaluations
    where preset_id = v_preset.id and evaluator_user_id = p_user_id
      and student_user_id = p_student_user_id;
    return null;
  end if;

  select sum((value)::numeric) into v_total from jsonb_each(v_clean);

  insert into public.evaluations (preset_id, evaluator_user_id, student_user_id, marks, total)
  values (v_preset.id, p_user_id, p_student_user_id, v_clean, v_total)
  on conflict (preset_id, evaluator_user_id, student_user_id)
  do update set marks = excluded.marks, total = excluded.total, updated_at = now();

  return v_total;
end;
$$;

grant execute on function public.evaluator_list_teams(uuid) to anon;
grant execute on function public.evaluator_set_marks(uuid, uuid, jsonb) to anon;

-- ----------------------------------------------------- evaluator admin -----

create or replace function public.admin_list_evaluators(p_admin_user_id uuid)
returns table (
  user_id uuid, login_id text, name text, role text,
  venue_ids uuid[], team_ids uuid[], evaluated_count bigint
)
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  return query
  select u.id, u.login_id, u.name, u.role,
    coalesce((select array_agg(ev.judging_venue_id) from public.evaluator_venues ev
              where ev.evaluator_user_id = u.id), '{}'::uuid[]),
    coalesce((select array_agg(t.student_user_id) from public.evaluator_teams t
              where t.evaluator_user_id = u.id), '{}'::uuid[]),
    (select count(*) from public.evaluations e
      where e.evaluator_user_id = u.id
        and e.preset_id = (select id from public.rubric_presets where is_active order by sort_order limit 1))
  from public.app_users u
  where u.role in ('faculty', 'jury')
  order by u.role, u.login_id;
end;
$$;

-- public.judging_venues holds both kinds of room. An evaluator covers teams
-- presenting, so only a 'judging' venue means anything here — a waiting room
-- silently resolves to zero teams. The UI only offers judging venues, but the
-- RPC is the real boundary, so it enforces it.
-- (The kind check was applied separately as
--  `evaluator_venues_must_be_judging_rooms`.)
create or replace function public.admin_set_evaluator_venues(
  p_admin_user_id uuid, p_evaluator_user_id uuid, p_venue_ids uuid[]
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_bad text;
begin
  perform public._require_admin(p_admin_user_id);

  select string_agg(v.name, ', ') into v_bad
  from public.judging_venues v
  where v.id = any(coalesce(p_venue_ids, '{}'::uuid[])) and v.kind <> 'judging';

  if v_bad is not null then
    raise exception 'Not a judging venue: % — evaluators cover presentation rooms', v_bad;
  end if;

  delete from public.evaluator_venues where evaluator_user_id = p_evaluator_user_id;
  insert into public.evaluator_venues (evaluator_user_id, judging_venue_id)
  select p_evaluator_user_id, unnest(coalesce(p_venue_ids, '{}'::uuid[]))
  on conflict do nothing;
  return true;
end;
$$;

create or replace function public.admin_set_evaluator_teams(
  p_admin_user_id uuid, p_evaluator_user_id uuid, p_student_ids uuid[]
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  delete from public.evaluator_teams where evaluator_user_id = p_evaluator_user_id;
  insert into public.evaluator_teams (evaluator_user_id, student_user_id)
  select p_evaluator_user_id, unnest(coalesce(p_student_ids, '{}'::uuid[]))
  on conflict do nothing;
  return true;
end;
$$;

-- Every evaluator's sheet for a round. The admin page averages these per
-- criterion; the raw rows are returned so a single outlier stays visible.
create or replace function public.admin_list_evaluations(p_admin_user_id uuid, p_preset_id uuid default null)
returns table (
  preset_id uuid,
  student_user_id uuid,
  evaluator_user_id uuid,
  evaluator_login_id text,
  evaluator_name text,
  evaluator_role text,
  marks jsonb,
  total numeric,
  updated_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(p_admin_user_id);
  return query
  select e.preset_id, e.student_user_id, e.evaluator_user_id,
    u.login_id, u.name, u.role, e.marks, e.total, e.updated_at
  from public.evaluations e
  join public.app_users u on u.id = e.evaluator_user_id
  where e.preset_id = coalesce(
    p_preset_id, (select id from public.rubric_presets where is_active order by sort_order limit 1))
  order by u.role, u.login_id;
end;
$$;

-- Admin override: edit or clear any evaluator's sheet for any round.
create or replace function public.admin_set_evaluation(
  p_admin_user_id uuid,
  p_preset_id uuid,
  p_evaluator_user_id uuid,
  p_student_user_id uuid,
  p_marks jsonb
)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_rubric jsonb;
  v_clean jsonb;
  v_total numeric;
begin
  perform public._require_admin(p_admin_user_id);
  select rubric into v_rubric from public.rubric_presets where id = p_preset_id;
  if v_rubric is null then raise exception 'That round no longer exists'; end if;

  v_clean := public._clean_marks(v_rubric, p_marks);

  if v_clean = '{}'::jsonb then
    delete from public.evaluations
    where preset_id = p_preset_id and evaluator_user_id = p_evaluator_user_id
      and student_user_id = p_student_user_id;
    return null;
  end if;

  select sum((value)::numeric) into v_total from jsonb_each(v_clean);

  insert into public.evaluations (preset_id, evaluator_user_id, student_user_id, marks, total)
  values (p_preset_id, p_evaluator_user_id, p_student_user_id, v_clean, v_total)
  on conflict (preset_id, evaluator_user_id, student_user_id)
  do update set marks = excluded.marks, total = excluded.total, updated_at = now();

  return v_total;
end;
$$;

grant execute on function public.admin_list_evaluators(uuid) to anon;
grant execute on function public.admin_set_evaluator_venues(uuid, uuid, uuid[]) to anon;
grant execute on function public.admin_set_evaluator_teams(uuid, uuid, uuid[]) to anon;
grant execute on function public.admin_list_evaluations(uuid, uuid) to anon;
grant execute on function public.admin_set_evaluation(uuid, uuid, uuid, uuid, jsonb) to anon;

-- Faculty and jury accounts are created from User Management like any other.
create or replace function public.admin_add_user(
  p_admin_user_id uuid,
  p_login_id text,
  p_role text,
  p_password text default 'licet@123'
)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._require_admin(p_admin_user_id);

  if p_role not in ('mentor', 'member', 'faculty', 'jury') then
    raise exception 'Invalid role';
  end if;
  if p_login_id is null or trim(p_login_id) = '' then
    raise exception 'A login ID is required';
  end if;
  if exists (select 1 from public.app_users where login_id = trim(p_login_id)) then
    raise exception 'That login ID already exists';
  end if;

  insert into public.app_users (login_id, role, password_hash, must_change_password)
  values (
    trim(p_login_id),
    p_role,
    extensions.crypt(coalesce(nullif(p_password, ''), 'licet@123'), extensions.gen_salt('bf')),
    true
  );
  return true;
end;
$$;

-- ---------------------------------------------- keeping the two in step ----
--
-- The Judging Rubric editor on /admin/submissions writes through
-- admin_set_judging_settings. Now that the active preset is the source of
-- truth for the rubric, that write has to land on the preset too — otherwise
-- an edit made there would be silently reverted the next time a round was
-- activated. (Applied separately as `judging_settings_rubric_follows_active_preset`.)

create or replace function public.admin_set_judging_settings(
  p_admin_user_id uuid,
  p_heading text,
  p_rubric jsonb,
  p_faculty_heading text,
  p_faculty_timing text
)
returns boolean
language plpgsql security definer set search_path = public as $$
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

  -- Keep the live round in step with what was just typed.
  update public.rubric_presets
  set rubric = p_rubric, updated_at = now()
  where is_active;

  return true;
end;
$$;

-- ------------------------------------------- creating / editing evaluators ----
--
-- Applied separately as `admin_add_user_with_name_and_admin_update_user`.
-- Creating a faculty / jury login from User Management carries a name (an
-- evaluator is a person, not a team number) and returns the new account's id
-- so the caller can assign their judging venues in the same step.

drop function if exists public.admin_add_user(uuid, text, text, text);

create function public.admin_add_user(
  p_admin_user_id uuid,
  p_login_id text,
  p_role text,
  p_password text default 'licet@123',
  p_name text default null
)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  perform public._require_admin(p_admin_user_id);

  if p_role not in ('mentor', 'member', 'faculty', 'jury') then
    raise exception 'Invalid role';
  end if;
  if p_login_id is null or trim(p_login_id) = '' then
    raise exception 'A login ID is required';
  end if;
  if exists (select 1 from public.app_users where login_id = trim(p_login_id)) then
    raise exception 'That login ID already exists';
  end if;

  insert into public.app_users (login_id, role, name, password_hash, must_change_password)
  values (
    trim(p_login_id),
    p_role,
    nullif(btrim(coalesce(p_name, '')), ''),
    extensions.crypt(coalesce(nullif(p_password, ''), 'licet@123'), extensions.gen_salt('bf')),
    true
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.admin_add_user(uuid, text, text, text, text) to anon;

-- Edit an existing login's details, the login ID included. null leaves a field
-- as it is; an empty string clears it. Everything else in the schema keys off
-- app_users.id (domain selections, mentor assignments, judging venue
-- assignments, evaluations), so a rename only changes what the person types to
-- sign in. Role changes are deliberately limited to swapping between the two
-- evaluator roles — turning a member into a mentor would strand their team,
-- submission and domain rows.
-- (The login-ID rename was applied separately as
--  `admin_update_user_can_rename_login_id`.)
create or replace function public.admin_update_user(
  p_admin_user_id uuid,
  p_login_id text,
  p_name text default null,
  p_phone text default null,
  p_email text default null,
  p_role text default null,
  p_new_login_id text default null
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_current text;
  v_new text := nullif(btrim(coalesce(p_new_login_id, '')), '');
begin
  perform public._require_admin(p_admin_user_id);

  select role into v_current from public.app_users where login_id = trim(p_login_id);
  if v_current is null then raise exception 'That login no longer exists'; end if;

  if p_role is not null and p_role <> v_current then
    if v_current not in ('faculty', 'jury') or p_role not in ('faculty', 'jury') then
      raise exception 'Only faculty and external jury accounts can change role';
    end if;
  end if;

  if v_new is not null and v_new <> trim(p_login_id) then
    if exists (select 1 from public.app_users where login_id = v_new) then
      raise exception 'That login ID already exists';
    end if;
  end if;

  update public.app_users
  set login_id = coalesce(v_new, login_id),
      name  = case when p_name  is null then name  else nullif(btrim(p_name), '')  end,
      phone = case when p_phone is null then phone else nullif(btrim(p_phone), '') end,
      email = case when p_email is null then email else nullif(btrim(p_email), '') end,
      role  = coalesce(p_role, role),
      updated_at = now()
  where login_id = trim(p_login_id);

  return true;
end;
$$;

grant execute on function public.admin_update_user(uuid, text, text, text, text, text, text) to anon;
drop function if exists public.admin_update_user(uuid, text, text, text, text, text);
