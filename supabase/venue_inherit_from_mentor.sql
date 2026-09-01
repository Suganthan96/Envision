-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Removes the separate "set a team's venue" allocation. A team's venue is
-- now always derived from whichever mentor it's assigned to:
--   - admin_assign_mentor copies the mentor's venue onto the team and
--     enforces that venue's team_capacity (excluding the team being
--     (re)assigned) instead of comparing two independently-set venues.
--   - admin_unassign_mentor clears the team's venue back to null.
--   - admin_set_venue is now mentor-only; calling it on a member/team
--     raises an exception, since that path no longer exists in the UI.
--
-- Verified live: assigning sets the team's venue to the mentor's venue;
-- unassigning clears it; direct admin_set_venue on a student is rejected.

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
  v_venue_capacity integer;
  v_venue_count integer;
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

  if v_mentor_venue is not null then
    select team_capacity into v_venue_capacity from public.venues where code = v_mentor_venue;

    select count(*) into v_venue_count
    from public.app_users u
    where u.role = 'member' and u.venue = v_mentor_venue and u.id <> p_student_user_id;

    if v_venue_capacity is not null and v_venue_count >= v_venue_capacity then
      raise exception 'This mentor''s venue is already at capacity';
    end if;
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

  update public.app_users set venue = v_mentor_venue, updated_at = now() where id = p_student_user_id;

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

  update public.app_users set venue = null, updated_at = now()
  where id = p_student_user_id and role = 'member';

  return found;
end;
$$;

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
declare
  v_role text;
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  select role into v_role from public.app_users where id = p_user_id;
  if v_role <> 'mentor' then
    raise exception 'Only a mentor''s venue can be set directly; a team''s venue follows its mentor';
  end if;

  if p_venue is not null and not exists (select 1 from public.venues where code = p_venue) then
    raise exception 'Unknown venue';
  end if;

  update public.app_users
  set venue = p_venue,
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

grant execute on function public.admin_assign_mentor(uuid, uuid, uuid) to anon;
grant execute on function public.admin_unassign_mentor(uuid, uuid) to anon;
grant execute on function public.admin_set_venue(uuid, uuid, text) to anon;
