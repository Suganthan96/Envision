-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Adds a `phone` column to app_users, captured at the same forced
-- first-login password-change step where mentors/members already give
-- their name. Threaded through every admin-facing RPC that already
-- returns a person's name, so contact info shows up wherever names do.

alter table public.app_users add column if not exists phone text;

create or replace function public.change_password(
  p_user_id uuid,
  p_old_password text,
  p_new_password text,
  p_name text default null,
  p_phone text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match boolean;
begin
  select (password_hash = extensions.crypt(p_old_password, password_hash)) into v_match
  from public.app_users where id = p_user_id;

  if v_match is not true then
    return false;
  end if;

  update public.app_users
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      must_change_password = false,
      name = coalesce(nullif(trim(p_name), ''), name),
      phone = coalesce(nullif(trim(p_phone), ''), phone),
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

drop function if exists public.admin_list_users(uuid);
drop function if exists public.admin_list_domain_selections(uuid);
drop function if exists public.admin_list_pending_domain_selections(uuid, text);

create function public.admin_list_users(p_admin_user_id uuid)
returns table (login_id text, role text, must_change_password boolean, updated_at timestamptz, name text, phone text)
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select u.login_id, u.role, u.must_change_password, u.updated_at, u.name, u.phone
  from public.app_users u
  order by u.role, u.login_id;
end;
$$;

create function public.admin_list_domain_selections(p_admin_user_id uuid)
returns table (login_id text, name text, phone text, role text, domain_id text, created_at timestamptz)
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select ds.login_id, au.name, au.phone, ds.role, ds.domain_id, ds.created_at
  from public.domain_selections ds
  left join public.app_users au on au.id = ds.user_id
  order by ds.role, ds.login_id;
end;
$$;

create function public.admin_list_pending_domain_selections(
  p_admin_user_id uuid,
  p_role text
)
returns table (login_id text, name text, phone text)
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
  select u.login_id, u.name, u.phone
  from public.app_users u
  where u.role = p_role
    and not exists (
      select 1 from public.domain_selections ds
      where ds.user_id = u.id and ds.role = p_role
    )
  order by u.login_id;
end;
$$;

grant execute on function public.change_password(uuid, text, text, text, text) to anon;
grant execute on function public.admin_list_users(uuid) to anon;
grant execute on function public.admin_list_domain_selections(uuid) to anon;
grant execute on function public.admin_list_pending_domain_selections(uuid, text) to anon;
