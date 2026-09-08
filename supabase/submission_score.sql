-- Already applied to the project via the Supabase MCP (migration
-- `add_submission_score`). Kept here for reference / reruns elsewhere.
-- Reflects the CURRENT deployed state.
--
-- One total score per team, entered by an admin on /admin/submissions.
-- The rubric in `judging_settings` (Background Study 10, Problem Statement
-- 15, User Identification 10, Solution 5, Teamwork & Presentation 10 = 50)
-- is only used to print blank judging sheets; this column is where the mark
-- the judges awarded actually gets recorded.
--
-- NULL means "not scored yet" and is deliberately distinct from a real 0.

alter table public.app_users
  add column if not exists submission_score numeric(6,2);

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
  submission_score numeric
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
    u.submission_score
  from public.app_users u
  left join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  left join public.mentor_assignments ma on ma.student_user_id = u.id
  left join public.app_users m on m.id = ma.mentor_user_id
  where u.role = 'member' and u.hidden is not true
  order by u.login_id;
end;
$$;

grant execute on function public.admin_list_submissions(uuid) to anon;

-- Set (or clear, by passing null) one team's total score.
create or replace function public.admin_set_submission_score(
  p_admin_user_id uuid,
  p_student_user_id uuid,
  p_score numeric
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

  if p_score is not null and (p_score < 0 or p_score > 1000) then
    raise exception 'Score out of range';
  end if;

  update public.app_users
  set submission_score = p_score
  where id = p_student_user_id and role = 'member';

  return found;
end;
$$;

grant execute on function public.admin_set_submission_score(uuid, uuid, numeric) to anon;
