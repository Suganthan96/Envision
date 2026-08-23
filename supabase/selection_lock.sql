-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Splits "can this role see the domain selection screen" (the existing
-- student/mentor_domain_selection_open flags) from "can this role actually
-- submit a selection" (new student/mentor_can_select flags). This lets the
-- admin open the screen for browsing/preview while still blocking the
-- actual pick — e.g. "let them see the domains, but not select yet."
--
-- select_domain enforces the *_can_select flag server-side (not just a UI
-- affordance), so the lock holds even if someone calls the RPC directly.

alter table public.app_settings
  add column if not exists student_can_select boolean not null default false,
  add column if not exists mentor_can_select boolean not null default false;

create or replace function public.get_app_settings()
returns table (
  student_domain_selection_open boolean,
  mentor_domain_selection_open boolean,
  student_can_select boolean,
  mentor_can_select boolean
)
language sql
security definer
set search_path = public
as $$
  select student_domain_selection_open, mentor_domain_selection_open, student_can_select, mentor_can_select
  from public.app_settings where id = 1;
$$;

create or replace function public.admin_set_selection_enabled(
  p_admin_user_id uuid,
  p_role text,
  p_enabled boolean
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

  if p_role not in ('mentor', 'member') then
    raise exception 'Invalid role';
  end if;

  if p_role = 'member' then
    update public.app_settings set student_can_select = p_enabled, updated_at = now() where id = 1;
  else
    update public.app_settings set mentor_can_select = p_enabled, updated_at = now() where id = 1;
  end if;

  return found;
end;
$$;

create or replace function public.select_domain(
  p_user_id uuid,
  p_login_id text,
  p_role text,
  p_domain_id text
)
returns table (ok boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_domain text;
  already_this_domain boolean;
  my_domain_count integer;
  capacity_count integer;
  v_can_select boolean;
begin
  perform pg_advisory_xact_lock(hashtext(p_domain_id));

  select exists (
    select 1 from public.domain_selections
    where user_id = p_user_id and role = p_role and domain_id = p_domain_id
  ) into already_this_domain;

  if already_this_domain then
    return query select true, 'ok'::text;
    return;
  end if;

  if p_role = 'member' then
    select student_can_select into v_can_select from public.app_settings where id = 1;
  else
    select mentor_can_select into v_can_select from public.app_settings where id = 1;
  end if;

  if not coalesce(v_can_select, false) then
    return query select false, 'Domain selection is not open yet.'::text;
    return;
  end if;

  if p_role = 'member' then
    select domain_id into existing_domain
    from public.domain_selections
    where user_id = p_user_id and role = 'member'
    limit 1;

    if existing_domain is not null then
      return query select false, 'You have already selected a domain and cannot change it.'::text;
      return;
    end if;

    select count(*) into capacity_count
    from public.domain_selections
    where domain_id = p_domain_id and role = 'member';

    if capacity_count >= 6 then
      return query select false, 'Domain full'::text;
      return;
    end if;
  elsif p_role = 'mentor' then
    select count(*) into my_domain_count
    from public.domain_selections
    where user_id = p_user_id and role = 'mentor';

    if my_domain_count >= 2 then
      return query select false, 'You can select at most 2 domains.'::text;
      return;
    end if;

    select count(*) into capacity_count
    from public.domain_selections
    where domain_id = p_domain_id and role = 'mentor';

    if capacity_count >= 7 then
      return query select false, 'Domain full'::text;
      return;
    end if;
  end if;

  insert into public.domain_selections (user_id, login_id, role, domain_id)
  values (p_user_id, p_login_id, p_role, p_domain_id);

  return query select true, 'ok'::text;
end;
$$;

grant execute on function public.get_app_settings() to anon;
grant execute on function public.admin_set_selection_enabled(uuid, text, boolean) to anon;
grant execute on function public.select_domain(uuid, text, text, text) to anon;
