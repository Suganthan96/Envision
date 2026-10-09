-- Programme years, part 2: the year tools (list years, per-year counts,
-- switch the current year, start a new year). Additive only — safe to run
-- once part 1 (the table split in editions.sql) is in place, and safe to
-- re-run (create or replace).

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
