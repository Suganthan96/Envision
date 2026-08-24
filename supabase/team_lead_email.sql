-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Adds a `email` column to app_users for the team lead's email. Unlike
-- name/phone/team_lead_name (captured on the forced first-login
-- password-change screen), email is NOT bundled into that form — per
-- product decision, it's asked separately, on a dedicated screen, the
-- NEXT time a member with no email logs in (see proxy.ts's needsEmail
-- gate and app/member/add-email). `login()` now also returns `email` so
-- the login route can decide whether to route there.

alter table public.app_users add column if not exists email text;

drop function if exists public.login(text, text, text);

create function public.login(
  p_login_id text,
  p_password text,
  p_name text default null
)
returns table (user_id uuid, role text, must_change_password boolean, name text, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched public.app_users%rowtype;
begin
  select * into matched
  from public.app_users u
  where u.login_id = p_login_id
    and u.password_hash = extensions.crypt(p_password, u.password_hash);

  if found then
    return query select matched.id, matched.role, matched.must_change_password, matched.name, matched.email;
    return;
  end if;

  return;
end;
$$;

-- Member-only (role check), validates a basic email shape server-side too
-- (defense in depth beyond the client's <input type="email">).
create or replace function public.update_team_lead_email(p_user_id uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := nullif(trim(p_email), '');
begin
  if v_email is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return false;
  end if;

  update public.app_users
  set email = v_email,
      updated_at = now()
  where id = p_user_id and role = 'member';

  return found;
end;
$$;

drop function if exists public.admin_list_users(uuid);
drop function if exists public.admin_list_domain_selections(uuid);
drop function if exists public.admin_list_pending_domain_selections(uuid, text);

create function public.admin_list_users(p_admin_user_id uuid)
returns table (login_id text, role text, must_change_password boolean, updated_at timestamptz, name text, phone text, email text)
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select u.login_id, u.role, u.must_change_password, u.updated_at, u.name, u.phone, u.email
  from public.app_users u
  order by u.role, u.login_id;
end;
$$;

create function public.admin_list_domain_selections(p_admin_user_id uuid)
returns table (login_id text, name text, phone text, email text, team_lead_name text, role text, domain_id text, created_at timestamptz)
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select ds.login_id, au.name, au.phone, au.email, au.team_lead_name, ds.role, ds.domain_id, ds.created_at
  from public.domain_selections ds
  left join public.app_users au on au.id = ds.user_id
  order by ds.role, ds.login_id;
end;
$$;

create function public.admin_list_pending_domain_selections(
  p_admin_user_id uuid,
  p_role text
)
returns table (login_id text, name text, phone text, email text)
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

  return query
  select u.login_id, u.name, u.phone, u.email
  from public.app_users u
  where u.role = p_role
    and not exists (
      select 1 from public.domain_selections ds
      where ds.user_id = u.id and ds.role = p_role
    )
  order by u.login_id;
end;
$$;

grant execute on function public.login(text, text, text) to anon;
grant execute on function public.update_team_lead_email(uuid, text) to anon;
grant execute on function public.admin_list_users(uuid) to anon;
grant execute on function public.admin_list_domain_selections(uuid) to anon;
grant execute on function public.admin_list_pending_domain_selections(uuid, text) to anon;
