-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Lets the admin set a per-domain ("theme") capacity, independently for
-- students and mentors, instead of the previous flat hardcoded 6/7 used
-- for every domain. select_domain now reads the cap from this table
-- (falling back to 6/6 members, 7 mentors if a domain's row is somehow
-- missing) instead of a literal number.

create table if not exists public.domain_capacities (
  domain_id text primary key,
  student_capacity integer not null default 6,
  mentor_capacity integer not null default 7,
  updated_at timestamptz not null default now()
);

insert into public.domain_capacities (domain_id)
values
  ('water-clean-energy'),
  ('smart-home-automation'),
  ('campus-360'),
  ('future-ready-cities'),
  ('smart-agriculture'),
  ('health-wellbeing'),
  ('waste-to-value'),
  ('ai-social-good'),
  ('climate-resilience'),
  ('inclusive-innovation')
on conflict (domain_id) do nothing;

alter table public.domain_capacities enable row level security;
-- No policies on purpose: only reachable through the security definer
-- RPCs below, never directly via the anon key.

create or replace function public.get_domain_capacities()
returns table (domain_id text, student_capacity integer, mentor_capacity integer)
language sql
security definer
set search_path = public
as $$
  select domain_id, student_capacity, mentor_capacity from public.domain_capacities order by domain_id;
$$;

create or replace function public.admin_set_domain_capacity(
  p_admin_user_id uuid,
  p_role text,
  p_domain_id text,
  p_capacity integer
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

  if p_capacity is null or p_capacity < 0 then
    raise exception 'Capacity must be zero or greater';
  end if;

  insert into public.domain_capacities (domain_id, student_capacity, mentor_capacity)
  values (
    p_domain_id,
    case when p_role = 'member' then p_capacity else 6 end,
    case when p_role = 'mentor' then p_capacity else 7 end
  )
  on conflict (domain_id) do update
  set student_capacity = case when p_role = 'member' then p_capacity else public.domain_capacities.student_capacity end,
      mentor_capacity = case when p_role = 'mentor' then p_capacity else public.domain_capacities.mentor_capacity end,
      updated_at = now();

  return true;
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
  v_student_capacity integer;
  v_mentor_capacity integer;
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

  select student_capacity, mentor_capacity into v_student_capacity, v_mentor_capacity
  from public.domain_capacities where domain_id = p_domain_id;

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

    if capacity_count >= coalesce(v_student_capacity, 6) then
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

    if capacity_count >= coalesce(v_mentor_capacity, 7) then
      return query select false, 'Domain full'::text;
      return;
    end if;
  end if;

  insert into public.domain_selections (user_id, login_id, role, domain_id)
  values (p_user_id, p_login_id, p_role, p_domain_id);

  return query select true, 'ok'::text;
end;
$$;

grant execute on function public.get_domain_capacities() to anon;
grant execute on function public.admin_set_domain_capacity(uuid, text, text, integer) to anon;
grant execute on function public.select_domain(uuid, text, text, text) to anon;
