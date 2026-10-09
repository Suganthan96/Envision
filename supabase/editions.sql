-- Programme years ("editions"): 2026-27, 2027-28, ...
--
-- Every year keeps its own teams, mentors, rounds, scores, rooms, timeline,
-- guidelines and settings, side by side; nothing is deleted when a new year
-- starts. Admins can open and edit any year; everyone else only signs in to
-- the current one, and the public pages can show any year read-only.
--
-- How it works
--   * Each table T is renamed to T_all and gains an `edition_id` column.
--   * A view named T (the old name) shows only the selected year's rows, so
--     every existing function keeps working unchanged against "its" year.
--   * The selected year is the `x-envision-edition` request header (sent by
--     the app when an admin switches year, or a public page shows a past
--     year), else the year marked current. See public.current_edition().
--   * Admin accounts have edition_id = null and appear in every year, so an
--     admin can sign in and work in any of them.
--
-- Changing a table later: alter public.T_all, then recreate the view with
--   select public._edition_view('T');
-- (a view's `select *` is fixed when it is created).
--
-- Applied to the project in two parts via the Supabase MCP: everything up
-- to "year RPCs" (part 1, the table split) on 2026-10-09; the year RPCs are
-- also in editions_part2.sql, which is safe to run on its own. Do not re-run
-- part 1 on a database where it has already been applied (the renames fail).

-- ------------------------------------------------------------- editions --

create table if not exists public.editions (
  id text primary key check (id ~ '^\d{4}-\d{2}$'),
  label text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists editions_one_current on public.editions (is_current) where is_current;
alter table public.editions enable row level security;
revoke all on public.editions from anon, authenticated;

insert into public.editions (id, label, is_current) values ('2026-27', '2026–27', true)
on conflict (id) do nothing;

-- The year this request works in: the header when it names a real year,
-- else the current year.
create or replace function public.current_edition()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select e.id from public.editions e
      where e.id = nullif(current_setting('request.headers', true)::json ->> 'x-envision-edition', '')),
    (select e.id from public.editions e where e.is_current limit 1)
  )
$$;

-- (Re)creates the filtered view for one table. Admin rows (edition_id null)
-- show in every year.
create or replace function public._edition_view(p_table text)
returns void
language plpgsql
set search_path to 'public'
as $$
begin
  execute format('drop view if exists public.%I', p_table);
  execute format(
    'create view public.%I with (security_invoker = true) as select * from public.%I where edition_id = (select public.current_edition())%s with local check option',
    p_table, p_table || '_all',
    case when p_table = 'app_users' then ' or edition_id is null' else '' end
  );
  -- Views do not inherit the tables' row-level security, so nothing but the
  -- security-definer functions may touch them.
  execute format('revoke all on public.%I from anon, authenticated', p_table);
end;
$$;

-- ------------------------------------------------------- split the tables --

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_users', 'app_settings', 'timeline_settings', 'guideline_settings', 'judging_settings',
    'session_feedback_links', 'domains', 'domain_capacities', 'domain_selections', 'venues',
    'team_members', 'mentor_assignments', 'judging_venues', 'judging_venue_assignments',
    'rubric_presets', 'evaluations', 'evaluator_venues', 'evaluator_teams', 'round_scores'
  ] loop
    execute format('alter table public.%I rename to %I', t, t || '_all');
    execute format('alter table public.%I add column edition_id text references public.editions(id)', t || '_all');
    -- Backfilling must not fire the tables' own triggers (evaluations would
    -- recompute round scores against views that don't exist yet).
    execute format('alter table public.%I disable trigger user', t || '_all');
    execute format('update public.%I set edition_id = %L', t || '_all', '2026-27');
    execute format('alter table public.%I enable trigger user', t || '_all');
    execute format('alter table public.%I alter column edition_id set default public.current_edition()', t || '_all');
    if t <> 'app_users' then
      execute format('alter table public.%I alter column edition_id set not null', t || '_all');
    end if;
    execute format('create index if not exists %I on public.%I (edition_id)', t || '_edition_idx', t || '_all');
    execute format('revoke all on public.%I from anon, authenticated', t || '_all');
  end loop;
end $$;

-- Admins belong to every year.
update public.app_users_all set edition_id = null where role = 'admin';

-- Keys that were unique overall are now unique within a year.
alter table public.app_users_all drop constraint app_users_login_id_key;
alter table public.app_users_all add constraint app_users_edition_login_key unique (edition_id, login_id);
create unique index app_users_admin_login_key on public.app_users_all (login_id) where edition_id is null;

alter table public.app_settings_all drop constraint app_settings_pkey;
alter table public.app_settings_all add primary key (edition_id, id);
alter table public.timeline_settings_all drop constraint timeline_settings_pkey;
alter table public.timeline_settings_all add primary key (edition_id, id);
alter table public.guideline_settings_all drop constraint guideline_settings_pkey;
alter table public.guideline_settings_all add primary key (edition_id, id);
alter table public.judging_settings_all drop constraint judging_settings_pkey;
alter table public.judging_settings_all add primary key (edition_id, id);

alter table public.session_feedback_links_all drop constraint session_feedback_links_pkey;
alter table public.session_feedback_links_all add primary key (edition_id, entry_id);
alter table public.domains_all drop constraint domains_pkey;
alter table public.domains_all add primary key (edition_id, id);
alter table public.domain_capacities_all drop constraint domain_capacities_pkey;
alter table public.domain_capacities_all add primary key (edition_id, domain_id);
alter table public.venues_all drop constraint venues_pkey;
alter table public.venues_all add primary key (edition_id, code);

alter table public.judging_venues_all drop constraint judging_venues_kind_name_key;
alter table public.judging_venues_all add constraint judging_venues_edition_kind_name_key unique (edition_id, kind, name);
alter table public.judging_venue_assignments_all drop constraint judging_venue_assignments_pkey;
alter table public.judging_venue_assignments_all add primary key (edition_id, kind, scope, ref_id);

alter table public.rubric_presets_all drop constraint rubric_presets_name_key;
alter table public.rubric_presets_all add constraint rubric_presets_edition_name_key unique (edition_id, name);
drop index public.rubric_presets_one_active;
create unique index rubric_presets_one_active on public.rubric_presets_all (edition_id) where is_active;

-- A login is unique within its year, and an admin login is unique across all.
create or replace function public._app_users_edition_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.role = 'admin' then
    new.edition_id := null;
  elsif new.edition_id is null then
    new.edition_id := public.current_edition();
  end if;
  if exists (
    select 1 from public.app_users_all u
    where u.login_id = new.login_id and u.id <> new.id
      and (u.edition_id is null or new.edition_id is null or u.edition_id = new.edition_id)
  ) then
    raise exception 'That login ID already exists';
  end if;
  return new;
end;
$$;

create trigger app_users_edition_guard
before insert or update of login_id, role, edition_id on public.app_users_all
for each row execute function public._app_users_edition_guard();

-- The old names, now one year at a time.
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_users', 'app_settings', 'timeline_settings', 'guideline_settings', 'judging_settings',
    'session_feedback_links', 'domains', 'domain_capacities', 'domain_selections', 'venues',
    'team_members', 'mentor_assignments', 'judging_venues', 'judging_venue_assignments',
    'rubric_presets', 'evaluations', 'evaluator_venues', 'evaluator_teams', 'round_scores'
  ] loop
    perform public._edition_view(t);
  end loop;
end $$;

-- ------------------------------------- upserts keyed on per-year columns --

create or replace function public.admin_add_domain(p_admin_user_id uuid, p_title text, p_description text, p_icon text, p_sdgs integer[])
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id text;
  v_base text;
  v_suffix integer := 1;
  v_next_sort integer;
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if p_title is null or trim(p_title) = '' then
    raise exception 'A title is required';
  end if;

  if p_icon not in ('water-energy','home','campus','city','agriculture','health','waste','ai-social','climate','inclusive') then
    raise exception 'Invalid icon';
  end if;

  v_base := lower(regexp_replace(regexp_replace(trim(p_title), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'));
  if v_base = '' then
    v_base := 'domain';
  end if;
  v_id := v_base;
  while exists (select 1 from public.domains where id = v_id) loop
    v_suffix := v_suffix + 1;
    v_id := v_base || '-' || v_suffix;
  end loop;

  select coalesce(max(sort_order), 0) + 1 into v_next_sort from public.domains;

  insert into public.domains (id, title, description, icon, sdgs, sort_order)
  values (v_id, trim(p_title), coalesce(trim(p_description), ''), p_icon, coalesce(p_sdgs, '{}'), v_next_sort);

  insert into public.domain_capacities (domain_id, student_capacity, mentor_capacity)
  values (v_id, 6, 7)
  on conflict (edition_id, domain_id) do nothing;

  return v_id;
end;
$function$;

create or replace function public.admin_set_domain_capacity(p_admin_user_id uuid, p_role text, p_domain_id text, p_capacity integer)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if p_role not in ('mentor', 'member') then
    raise exception 'Invalid role';
  end if;

  if p_capacity is null or p_capacity < 0 then
    raise exception 'Capacity must be zero or greater';
  end if;

  insert into public.domain_capacities (domain_id, student_capacity, mentor_capacity)
  values (
    p_domain_id,
    case when p_role = 'member' then p_capacity else 6 end,
    case when p_role = 'mentor' then p_capacity else 7 end
  )
  on conflict (edition_id, domain_id) do update
  set student_capacity = case when p_role = 'member' then p_capacity else public.domain_capacities.student_capacity end,
      mentor_capacity = case when p_role = 'mentor' then p_capacity else public.domain_capacities.mentor_capacity end,
      updated_at = now();

  return true;
end;
$function$;

create or replace function public.admin_set_feedback_link(p_admin_user_id uuid, p_entry_id text, p_url text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  insert into public.session_feedback_links (entry_id, url, updated_at)
  values (p_entry_id, nullif(trim(p_url), ''), now())
  on conflict (edition_id, entry_id)
  do update set url = excluded.url, updated_at = now();

  return true;
end;
$function$;

create or replace function public.admin_set_judging_assignment(p_admin_user_id uuid, p_scope text, p_ref_id text, p_venue_id uuid, p_kind text default 'judging'::text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    on conflict (edition_id, kind, scope, ref_id)
    do update set judging_venue_id = excluded.judging_venue_id, updated_at = now();
  end if;
  return true;
end;
$function$;

-- ------------------------------------------------------------ year RPCs --

create or replace function public.get_editions()
returns table (id text, label text, is_current boolean, created_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.id, e.label, e.is_current, e.created_at from public.editions e order by e.id desc
$$;

-- Counts per year for the Years page.
create or replace function public.admin_edition_stats(p_admin_user_id uuid)
returns table (edition_id text, teams bigint, mentors bigint, evaluators bigint, rounds bigint, scored bigint, submitted bigint)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  perform public._require_admin(p_admin_user_id);
  return query
  select e.id,
    (select count(*) from public.app_users_all u where u.edition_id = e.id and u.role = 'member' and not u.hidden),
    (select count(*) from public.app_users_all u where u.edition_id = e.id and u.role = 'mentor' and not u.hidden),
    (select count(*) from public.app_users_all u where u.edition_id = e.id and u.role in ('faculty', 'jury') and not u.hidden),
    (select count(*) from public.rubric_presets_all r where r.edition_id = e.id),
    (select count(distinct s.student_user_id) from public.round_scores_all s where s.edition_id = e.id),
    (select count(*) from public.app_users_all u where u.edition_id = e.id and u.role = 'member'
       and (u.submission_file_url is not null or u.submission_canva_url is not null))
  from public.editions e
  order by e.id desc;
end;
$$;

create or replace function public.admin_set_current_edition(p_admin_user_id uuid, p_edition_id text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public._require_admin(p_admin_user_id);
  if not exists (select 1 from public.editions where id = p_edition_id) then
    raise exception 'That year does not exist';
  end if;
  update public.editions set is_current = false where is_current and id <> p_edition_id;
  update public.editions set is_current = true where id = p_edition_id;
  return true;
end;
$$;

-- Starts a new programme year. The source year is left exactly as it is.
--   p_options: { themes, rounds, rooms, timeline, guidelines } booleans —
--     what to copy from p_from_edition as a starting point. Teams, mentors,
--     scores, selections and allocations are never copied.
--   p_team_count: creates team logins "1".."n" (password licet@123).
--   p_mentor_ids: creates mentor logins for these registration numbers.
create or replace function public.admin_start_edition(
  p_admin_user_id uuid,
  p_edition_id text,
  p_label text,
  p_from_edition text,
  p_options jsonb,
  p_team_count integer,
  p_mentor_ids text[],
  p_make_current boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_from text := coalesce(nullif(p_from_edition, ''), (select id from public.editions where is_current));
  v_year text := left(p_edition_id, 4);
  v_mentors text[];
  v_bad text;
  v_teams integer := coalesce(p_team_count, 0);
  v_hash text := extensions.crypt('licet@123', extensions.gen_salt('bf'));
  v_opt jsonb := coalesce(p_options, '{}'::jsonb);
begin
  perform public._require_admin(p_admin_user_id);

  if p_edition_id !~ '^\d{4}-\d{2}$' then
    raise exception 'The year must look like 2027-28';
  end if;
  if exists (select 1 from public.editions where id = p_edition_id) then
    raise exception 'The year % already exists', p_edition_id;
  end if;
  if not exists (select 1 from public.editions where id = v_from) then
    raise exception 'The year to copy from does not exist';
  end if;
  if v_teams < 0 or v_teams > 500 then
    raise exception 'The number of teams must be between 0 and 500';
  end if;

  select array_agg(distinct btrim(m)) into v_mentors
  from unnest(coalesce(p_mentor_ids, '{}'::text[])) m where btrim(m) <> '';
  select string_agg(m, ', ') into v_bad from unnest(coalesce(v_mentors, '{}')) m where m !~ '^3111\d{8}$';
  if v_bad is not null then
    raise exception 'Not a valid registration number (12 digits starting 3111): %', v_bad;
  end if;

  insert into public.editions (id, label) values (p_edition_id, coalesce(nullif(btrim(p_label), ''), p_edition_id));

  -- Settings start closed, whatever the source year had open.
  insert into public.app_settings_all (edition_id, id) values (p_edition_id, 1);

  insert into public.judging_settings_all (edition_id, id, report_heading, rubric, faculty_heading, faculty_timing)
  select p_edition_id, 1,
    regexp_replace(s.report_heading, '20\d\d', v_year),
    s.rubric,
    regexp_replace(s.faculty_heading, '20\d\d', v_year),
    s.faculty_timing
  from public.judging_settings_all s
  where s.edition_id = v_from and coalesce((v_opt ->> 'rounds')::boolean, false);
  if not found then
    insert into public.judging_settings_all (edition_id, id, report_heading, faculty_heading)
    values (p_edition_id, 1, 'EnVision ' || v_year || ' - Judging Sheet', 'EnVision ' || v_year || ' - Faculty Schedule');
  end if;

  insert into public.timeline_settings_all (edition_id, id, phases)
  select p_edition_id, 1, case when coalesce((v_opt ->> 'timeline')::boolean, false) then t.phases else '[]'::jsonb end
  from public.timeline_settings_all t where t.edition_id = v_from;
  if not found then
    insert into public.timeline_settings_all (edition_id, id) values (p_edition_id, 1);
  end if;

  if coalesce((v_opt ->> 'guidelines')::boolean, false) then
    insert into public.guideline_settings_all (edition_id, id, slides, file_name, file_data, title)
    select p_edition_id, 1, g.slides, g.file_name, g.file_data, g.title
    from public.guideline_settings_all g where g.edition_id = v_from;
  end if;
  if not exists (select 1 from public.guideline_settings_all where edition_id = p_edition_id) then
    insert into public.guideline_settings_all (edition_id, id) values (p_edition_id, 1);
  end if;

  if coalesce((v_opt ->> 'themes')::boolean, false) then
    insert into public.domains_all (edition_id, id, title, description, icon, sdgs, sort_order)
    select p_edition_id, d.id, d.title, d.description, d.icon, d.sdgs, d.sort_order
    from public.domains_all d where d.edition_id = v_from;
    insert into public.domain_capacities_all (edition_id, domain_id, student_capacity, mentor_capacity)
    select p_edition_id, c.domain_id, c.student_capacity, c.mentor_capacity
    from public.domain_capacities_all c where c.edition_id = v_from;
  end if;

  if coalesce((v_opt ->> 'rounds')::boolean, false) then
    insert into public.rubric_presets_all (edition_id, name, rubric, is_active, sort_order, scores_published, tiebreak)
    select p_edition_id, r.name, r.rubric, r.is_active, r.sort_order, false, r.tiebreak
    from public.rubric_presets_all r where r.edition_id = v_from;
  end if;

  if coalesce((v_opt ->> 'rooms')::boolean, false) then
    insert into public.venues_all (edition_id, code, team_capacity)
    select p_edition_id, v.code, v.team_capacity from public.venues_all v where v.edition_id = v_from;
    insert into public.judging_venues_all (edition_id, name, kind, sort_order)
    select p_edition_id, v.name, v.kind, v.sort_order from public.judging_venues_all v where v.edition_id = v_from;
  end if;

  insert into public.app_users_all (edition_id, login_id, role, password_hash, must_change_password)
  select p_edition_id, g::text, 'member', v_hash, true from generate_series(1, v_teams) g;

  insert into public.app_users_all (edition_id, login_id, role, password_hash, must_change_password)
  select p_edition_id, m, 'mentor', v_hash, true from unnest(coalesce(v_mentors, '{}')) m;

  if coalesce(p_make_current, false) then
    update public.editions set is_current = false where is_current;
    update public.editions set is_current = true where id = p_edition_id;
  end if;

  return jsonb_build_object(
    'edition', p_edition_id,
    'teams', v_teams,
    'mentors', coalesce(array_length(v_mentors, 1), 0),
    'current', coalesce(p_make_current, false)
  );
end;
$$;

grant execute on function public.get_editions() to anon, authenticated;
grant execute on function public.admin_edition_stats(uuid) to anon, authenticated;
grant execute on function public.admin_set_current_edition(uuid, text) to anon, authenticated;
grant execute on function public.admin_start_edition(uuid, text, text, text, jsonb, integer, text[], boolean) to anon, authenticated;
revoke all on function public._edition_view(text) from public, anon, authenticated;
