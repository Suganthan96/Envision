-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Lets the admin control, independently per role, whether members
-- ("student") and mentors see the domain selection screen after login.
-- While closed (the default for both), that role is shown the program
-- timeline instead of DomainSelectionPage.
--
-- Singleton table: exactly one row, id = 1.

create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  student_domain_selection_open boolean not null default false,
  mentor_domain_selection_open boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, student_domain_selection_open, mentor_domain_selection_open)
values (1, false, false)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;
-- No policies on purpose: only reachable through the security definer RPCs
-- below, never directly via the anon key.

create or replace function public.get_app_settings()
returns table (student_domain_selection_open boolean, mentor_domain_selection_open boolean)
language sql
security definer
set search_path = public
as $$
  select student_domain_selection_open, mentor_domain_selection_open
  from public.app_settings where id = 1;
$$;

create or replace function public.admin_set_domain_selection_open(
  p_admin_user_id uuid,
  p_role text,
  p_open boolean
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
    update public.app_settings set student_domain_selection_open = p_open, updated_at = now() where id = 1;
  else
    update public.app_settings set mentor_domain_selection_open = p_open, updated_at = now() where id = 1;
  end if;

  return found;
end;
$$;

grant execute on function public.get_app_settings() to anon;
grant execute on function public.admin_set_domain_selection_open(uuid, text, boolean) to anon;
