-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Lets the admin pair mentors with student teams (drag-and-drop UI at
-- /admin/matching). Each team gets at most one mentor; each mentor is
-- capped at 2 teams — the cap is enforced in admin_assign_mentor since it
-- requires counting existing rows, not a simple column constraint.

create table if not exists public.mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_user_id uuid not null references public.app_users(id) on delete cascade,
  student_user_id uuid not null references public.app_users(id) on delete cascade unique,
  created_at timestamptz not null default now()
);

create index if not exists mentor_assignments_mentor_idx on public.mentor_assignments(mentor_user_id);

alter table public.mentor_assignments enable row level security;
-- No policies on purpose: only reachable through the security definer
-- RPCs below, never directly via the anon key.

create or replace function public.admin_list_assignable_mentors(p_admin_user_id uuid)
returns table (mentor_user_id uuid, login_id text, name text, domain_ids text[], assigned_student_ids uuid[])
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id,
    u.login_id,
    u.name,
    coalesce(
      (select array_agg(ds.domain_id order by ds.created_at) from public.domain_selections ds
       where ds.user_id = u.id and ds.role = 'mentor'),
      '{}'::text[]
    ),
    coalesce(
      (select array_agg(ma.student_user_id order by ma.created_at) from public.mentor_assignments ma
       where ma.mentor_user_id = u.id),
      '{}'::uuid[]
    )
  from public.app_users u
  where u.role = 'mentor'
    and exists (select 1 from public.domain_selections ds where ds.user_id = u.id and ds.role = 'mentor')
  order by u.login_id;
end;
$$;

create or replace function public.admin_list_assignable_students(p_admin_user_id uuid)
returns table (student_user_id uuid, login_id text, team_name text, domain_id text, mentor_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id,
    u.login_id,
    u.name,
    ds.domain_id,
    ma.mentor_user_id
  from public.app_users u
  join public.domain_selections ds on ds.user_id = u.id and ds.role = 'member'
  left join public.mentor_assignments ma on ma.student_user_id = u.id
  where u.role = 'member'
  order by u.login_id;
end;
$$;

create or replace function public.admin_assign_mentor(
  p_admin_user_id uuid,
  p_mentor_user_id uuid,
  p_student_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_count integer;
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if not exists (select 1 from public.app_users m where m.id = p_mentor_user_id and m.role = 'mentor') then
    raise exception 'Not a mentor';
  end if;

  if not exists (select 1 from public.app_users s where s.id = p_student_user_id and s.role = 'member') then
    raise exception 'Not a student team';
  end if;

  select count(*) into v_current_count
  from public.mentor_assignments
  where mentor_user_id = p_mentor_user_id
    and student_user_id <> p_student_user_id;

  if v_current_count >= 2 then
    raise exception 'This mentor already has 2 teams assigned';
  end if;

  insert into public.mentor_assignments (mentor_user_id, student_user_id)
  values (p_mentor_user_id, p_student_user_id)
  on conflict (student_user_id)
  do update set mentor_user_id = excluded.mentor_user_id, created_at = now();

  return true;
end;
$$;

create or replace function public.admin_unassign_mentor(
  p_admin_user_id uuid,
  p_student_user_id uuid
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

  delete from public.mentor_assignments where student_user_id = p_student_user_id;
  return found;
end;
$$;

grant execute on function public.admin_list_assignable_mentors(uuid) to anon;
grant execute on function public.admin_list_assignable_students(uuid) to anon;
grant execute on function public.admin_assign_mentor(uuid, uuid, uuid) to anon;
grant execute on function public.admin_unassign_mentor(uuid, uuid) to anon;
