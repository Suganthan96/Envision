-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere.
--
-- Admin-entered judging marks, one sheet per team per round. Marks used to
-- live in a single slot on app_users (submission_score*), so starting a new
-- round would have written over the last one. Each round (rubric preset) now
-- keeps its own marks; the old slot is copied into the round that was active
-- when they were entered and is no longer written to.

create table if not exists public.round_scores (
  preset_id uuid not null references public.rubric_presets (id) on delete restrict,
  student_user_id uuid not null references public.app_users (id) on delete cascade,
  marks jsonb not null,
  total numeric not null,
  updated_at timestamptz not null default now(),
  primary key (preset_id, student_user_id)
);

alter table public.round_scores enable row level security;

-- Backfill: the marks already entered belong to the round that was live.
-- (On this project PoC presentation had already been made live by then, so
-- the 61 sheets were moved to "Immediate Evaluation" afterwards — their
-- criteria are that round's.)
insert into public.round_scores (preset_id, student_user_id, marks, total, updated_at)
select p.id, u.id, u.submission_score_breakdown, u.submission_score, coalesce(u.updated_at, now())
from public.app_users u
cross join lateral (
  select id from public.rubric_presets where is_active order by sort_order limit 1
) p
where u.role = 'member'
  and u.submission_score is not null
  and u.submission_score_breakdown is not null
  and u.submission_score_breakdown <> '{}'::jsonb
on conflict do nothing;

-- One card per round on /admin/scores.
create or replace function public.admin_list_round_score_summaries(p_admin_user_id uuid)
returns table (preset_id uuid, scored_count bigint, average_total numeric, top_total numeric, updated_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public._require_admin(p_admin_user_id);
  return query
  select s.preset_id, count(*), round(avg(s.total), 2), max(s.total), max(s.updated_at)
  from public.round_scores s
  join public.app_users u on u.id = s.student_user_id and u.role = 'member' and u.hidden is not true
  group by s.preset_id;
end;
$$;

create or replace function public.admin_list_round_scores(p_admin_user_id uuid, p_preset_id uuid)
returns table (student_user_id uuid, marks jsonb, total numeric)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public._require_admin(p_admin_user_id);
  return query
  select s.student_user_id, s.marks, s.total
  from public.round_scores s
  where s.preset_id = p_preset_id;
end;
$$;

-- Same validation as the old admin_set_submission_scores; null / {} clears.
create or replace function public.admin_set_round_scores(
  p_admin_user_id uuid,
  p_preset_id uuid,
  p_student_user_id uuid,
  p_marks jsonb
)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_total numeric;
  v_key text;
  v_val jsonb;
begin
  perform public._require_admin(p_admin_user_id);

  if not exists (select 1 from public.rubric_presets where id = p_preset_id) then
    raise exception 'That round no longer exists';
  end if;
  if not exists (select 1 from public.app_users where id = p_student_user_id and role = 'member') then
    raise exception 'Not a student team';
  end if;

  if p_marks is null or jsonb_typeof(p_marks) <> 'object' or p_marks = '{}'::jsonb then
    delete from public.round_scores
    where preset_id = p_preset_id and student_user_id = p_student_user_id;
    return null;
  end if;

  for v_key, v_val in select * from jsonb_each(p_marks) loop
    if jsonb_typeof(v_val) <> 'number' then
      raise exception 'Mark for "%" must be a number', v_key;
    end if;
    if (v_val)::numeric < 0 or (v_val)::numeric > 1000 then
      raise exception 'Mark for "%" is out of range', v_key;
    end if;
  end loop;

  select sum((value)::numeric) into v_total from jsonb_each(p_marks);

  insert into public.round_scores (preset_id, student_user_id, marks, total, updated_at)
  values (p_preset_id, p_student_user_id, p_marks, v_total, now())
  on conflict (preset_id, student_user_id)
  do update set marks = excluded.marks, total = excluded.total, updated_at = now();

  return v_total;
end;
$$;

-- The Submissions page shows (and exports) the live round's score.
create or replace function public.admin_list_submissions(p_admin_user_id uuid)
returns table (student_user_id uuid, login_id text, team_name text, team_lead_name text, project_title text, venue text, domain_id text, mentor_user_id uuid, mentor_name text, submission_canva_url text, submission_file_url text, submission_file_name text, submission_updated_at timestamptz, submission_score numeric, submission_score_breakdown jsonb)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;
  return query
  select u.id, u.login_id, u.name, u.team_lead_name, u.project_title, coalesce(u.venue, m.venue),
    ds.domain_id, m.id, m.name,
    u.submission_canva_url, u.submission_file_url, u.submission_file_name, u.submission_updated_at,
    rs.total, rs.marks
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  left join public.mentor_assignments ma on ma.student_user_id = u.id
  left join public.app_users m on m.id = ma.mentor_user_id
  left join public.round_scores rs
    on rs.student_user_id = u.id
   and rs.preset_id = (select id from public.rubric_presets where is_active order by sort_order limit 1)
  where u.role = 'member' and u.hidden is not true
  order by u.login_id;
end;
$$;

-- A round that holds marks can't be deleted out from under them.
create or replace function public.admin_delete_rubric_preset(p_admin_user_id uuid, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public._require_admin(p_admin_user_id);
  if exists (select 1 from public.rubric_presets where id = p_id and is_active) then
    raise exception 'Activate another round before deleting this one';
  end if;
  if exists (select 1 from public.round_scores where preset_id = p_id) then
    raise exception 'This round has scores entered — clear them on the Scores page before deleting it';
  end if;
  delete from public.rubric_presets where id = p_id;
  return true;
end;
$$;

-- Older clients: write into the live round instead of the retired slot.
create or replace function public.admin_set_submission_scores(p_admin_user_id uuid, p_student_user_id uuid, p_marks jsonb)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_preset uuid;
begin
  select id into v_preset from public.rubric_presets where is_active order by sort_order limit 1;
  if v_preset is null then raise exception 'No active round'; end if;
  return public.admin_set_round_scores(p_admin_user_id, v_preset, p_student_user_id, p_marks);
end;
$$;
