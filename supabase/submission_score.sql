-- Already applied to the project via the Supabase MCP (migrations
-- `add_submission_score`, `add_submission_score_breakdown` and
-- `drop_superseded_set_submission_score`). Kept here for reference / reruns
-- elsewhere. Reflects the CURRENT deployed state.
--
-- Scoring for a team's submission, entered by an admin on /admin/submissions.
-- Marks are entered one criterion at a time against the rubric in
-- `judging_settings` (Background Study 10, Problem Statement 15, User
-- Identification 10, Solution 5, Team work and presentation 10 = 50) and the
-- total is derived from them.
--
--   submission_score_breakdown  the per-criterion marks, keyed by rubric label
--   submission_score            the total, ALWAYS recomputed from the parts
--
-- Keeping the total derived rather than typed means the two can never
-- disagree. Only the total is surfaced in the teams list and the XLSX export.
--
-- NULL means "not scored yet" and is deliberately distinct from a real 0.

alter table public.app_users
  add column if not exists submission_score numeric(6,2);

-- Per-criterion marks, e.g. {"Background Study": 8, "Problem Statement": 13}.
-- A label key survives rubric reordering; a renamed criterion simply loses its
-- old mark, which is the honest outcome.
alter table public.app_users
  add column if not exists submission_score_breakdown jsonb;

alter table public.app_users
  drop constraint if exists app_users_submission_score_range;
alter table public.app_users
  add constraint app_users_submission_score_range
  check (submission_score is null or (submission_score >= 0 and submission_score <= 1000));

-- The return type changes, so the old signature has to be dropped first —
-- Postgres refuses "cannot change return type of existing function" otherwise.
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
  submission_updated_at timestamptz,
  submission_score numeric,
  submission_score_breakdown jsonb
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
  select u.id, u.login_id, u.name, u.team_lead_name, u.project_title, coalesce(u.venue, m.venue),
    ds.domain_id, m.id, m.name,
    u.submission_canva_url, u.submission_file_url, u.submission_file_name, u.submission_updated_at,
    u.submission_score, u.submission_score_breakdown
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  left join public.mentor_assignments ma on ma.student_user_id = u.id
  left join public.app_users m on m.id = ma.mentor_user_id
  where u.role = 'member' and u.hidden is not true
  order by u.login_id;
end;
$$;

grant execute on function public.admin_list_submissions(uuid) to anon;

-- Save one team's per-criterion marks and derive the total from them.
-- Passing null / {} clears the team back to unscored. Returns the new total.
create or replace function public.admin_set_submission_scores(
  p_admin_user_id uuid,
  p_student_user_id uuid,
  p_marks jsonb
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_key text;
  v_val jsonb;
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if p_marks is null or jsonb_typeof(p_marks) <> 'object' or p_marks = '{}'::jsonb then
    update public.app_users
    set submission_score_breakdown = null, submission_score = null
    where id = p_student_user_id and role = 'member';
    return null;
  end if;

  -- Every value must be a non-negative number; reject the whole save otherwise
  -- rather than silently storing junk.
  for v_key, v_val in select * from jsonb_each(p_marks) loop
    if jsonb_typeof(v_val) <> 'number' then
      raise exception 'Mark for "%" must be a number', v_key;
    end if;
    if (v_val)::numeric < 0 or (v_val)::numeric > 1000 then
      raise exception 'Mark for "%" is out of range', v_key;
    end if;
  end loop;

  select sum((value)::numeric) into v_total from jsonb_each(p_marks);

  update public.app_users
  set submission_score_breakdown = p_marks,
      submission_score = v_total
  where id = p_student_user_id and role = 'member';

  return v_total;
end;
$$;

grant execute on function public.admin_set_submission_scores(uuid, uuid, jsonb) to anon;

-- Superseded: it could write a total that disagreed with the breakdown.
drop function if exists public.admin_set_submission_score(uuid, uuid, numeric);
