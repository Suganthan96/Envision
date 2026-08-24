-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Adds a venue ('C20' or 'G01') to mentors and student teams, settable
-- from the Mentor Matching board. admin_assign_mentor now rejects
-- assigning a team to a mentor in a different venue (when both have a
-- venue set — if either is unset, no constraint is enforced, so venues
-- can be filled in gradually without blocking existing assignments).
--
-- admin_list_assignable_mentors/students were also extended to surface
-- venue plus the contact fields (team_lead_name, phone, email) needed for
-- the PDF export on that page.

alter table public.app_users add column if not exists venue text check (venue is null or venue in ('C20', 'G01'));

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
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if p_venue is not null and p_venue not in ('C20', 'G01') then
    raise exception 'Invalid venue';
  end if;

  update public.app_users
  set venue = p_venue,
      updated_at = now()
  where id = p_user_id and role in ('mentor', 'member');

  return found;
end;
$$;

drop function if exists public.admin_list_assignable_mentors(uuid);
drop function if exists public.admin_list_assignable_students(uuid);

create function public.admin_list_assignable_mentors(p_admin_user_id uuid)
returns table (
  mentor_user_id uuid,
  login_id text,
  name text,
  venue text,
  domain_ids text[],
  assigned_student_ids uuid[]
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
  select
    u.id,
    u.login_id,
    u.name,
    u.venue,
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

create function public.admin_list_assignable_students(p_admin_user_id uuid)
returns table (
  student_user_id uuid,
  login_id text,
  team_name text,
  team_lead_name text,
  phone text,
  email text,
  venue text,
  domain_id text,
  mentor_user_id uuid
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
  select
    u.id,
    u.login_id,
    u.name,
    u.team_lead_name,
    u.phone,
    u.email,
    u.venue,
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
  v_mentor_venue text;
  v_student_venue text;
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

  select venue into v_mentor_venue from public.app_users where id = p_mentor_user_id;
  select venue into v_student_venue from public.app_users where id = p_student_user_id;

  if v_mentor_venue is not null and v_student_venue is not null and v_mentor_venue <> v_student_venue then
    raise exception 'This team is in a different venue from the mentor';
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

grant execute on function public.admin_set_venue(uuid, uuid, text) to anon;
grant execute on function public.admin_list_assignable_mentors(uuid) to anon;
grant execute on function public.admin_list_assignable_students(uuid) to anon;
grant execute on function public.admin_assign_mentor(uuid, uuid, uuid) to anon;
