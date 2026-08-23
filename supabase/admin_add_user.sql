-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Lets the admin create a single mentor/member account from the User
-- Management table, mirroring how bulk-imported accounts start out:
-- must_change_password = true, default shared password ("licet@123")
-- unless the admin supplies their own. Scoped to role in
-- ('mentor', 'member') — admin accounts can't be created through this UI.

create or replace function public.admin_add_user(
  p_admin_user_id uuid,
  p_login_id text,
  p_role text,
  p_password text default 'licet@123'
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (select 1 from public.app_users a where a.id = p_admin_user_id and a.role = 'admin') then
    raise exception 'Not authorized';
  end if;

  if p_role not in ('mentor', 'member') then
    raise exception 'Invalid role';
  end if;

  if p_login_id is null or trim(p_login_id) = '' then
    raise exception 'A login ID is required';
  end if;

  if exists (select 1 from public.app_users where login_id = trim(p_login_id)) then
    raise exception 'That login ID already exists';
  end if;

  insert into public.app_users (login_id, role, password_hash, must_change_password)
  values (
    trim(p_login_id),
    p_role,
    extensions.crypt(coalesce(nullif(p_password, ''), 'licet@123'), extensions.gen_salt('bf')),
    true
  );

  return true;
end;
$$;

grant execute on function public.admin_add_user(uuid, text, text, text) to anon;
