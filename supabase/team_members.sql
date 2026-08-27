-- Adds a per-team roster (up to 7 members, including the team lead) that
-- students can edit from their dashboard. Each member has their own name,
-- email, and department (dropdown: AI&DS, CSE A, CSE B, ECE, EEE, MECH) —
-- department is per-member, not per-team. Already applied to the project via
-- the Supabase MCP; kept here for reference / reruns elsewhere.
--
-- The first entry in the roster is treated as the team lead and is kept in
-- sync onto app_users.team_lead_name / app_users.email so the existing
-- mentor-matching board and PDF export (which read those two columns)
-- continue to show the lead without any changes on that side.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  email text,
  department text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists team_members_student_user_id_idx on public.team_members(student_user_id);

alter table public.team_members enable row level security;

alter table public.team_members
  drop constraint if exists team_members_department_check;

alter table public.team_members
  add constraint team_members_department_check
  check (department is null or department in ('AI&DS','CSE A','CSE B','ECE','EEE','MECH'));

create or replace function public.get_team_members(p_user_id uuid)
returns table (id uuid, name text, email text, department text)
language sql
security definer
set search_path = public
as $$
  select id, name, email, department
  from public.team_members
  where student_user_id = p_user_id
  order by sort_order, created_at;
$$;

create or replace function public.set_team_members(
  p_user_id uuid,
  p_members jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_lead_name text;
  v_lead_email text;
begin
  if not exists (select 1 from public.app_users where id = p_user_id and role = 'member') then
    return false;
  end if;

  select count(*) into v_count from jsonb_array_elements(p_members);
  if v_count < 1 or v_count > 7 then
    raise exception 'A team must have between 1 and 7 members';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_members) as m
    where nullif(trim(m->>'name'), '') is null
  ) then
    raise exception 'Every team member needs a name';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_members) as m
    where nullif(trim(m->>'department'), '') is not null
      and trim(m->>'department') not in ('AI&DS','CSE A','CSE B','ECE','EEE','MECH')
  ) then
    raise exception 'Invalid department';
  end if;

  delete from public.team_members where student_user_id = p_user_id;

  insert into public.team_members (student_user_id, name, email, department, sort_order)
  select p_user_id, trim(m->>'name'), nullif(trim(m->>'email'), ''), nullif(trim(m->>'department'), ''), ord - 1
  from jsonb_array_elements(p_members) with ordinality as t(m, ord);

  select trim(m->>'name'), nullif(trim(m->>'email'), '')
  into v_lead_name, v_lead_email
  from jsonb_array_elements(p_members) as m
  limit 1;

  update public.app_users
  set team_lead_name = v_lead_name,
      email = coalesce(v_lead_email, email),
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

grant execute on function public.get_team_members(uuid) to anon;
grant execute on function public.set_team_members(uuid, jsonb) to anon;
