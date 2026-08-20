-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Lets a signed-in member rename their team from the dashboard at any
-- time, without going through the password-change flow again. Reuses the
-- same `app_users.name` column mentors use for their personal name — for
-- a member, that column just holds the team's name instead. Restricted to
-- role = 'member'; mentors already have their own name-capture flow (see
-- mentor_self_registration.sql) and don't need this.

create or replace function public.update_name(p_user_id uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(trim(p_name), '');
begin
  if v_name is null then
    return false;
  end if;

  update public.app_users
  set name = v_name,
      updated_at = now()
  where id = p_user_id and role = 'member';

  return found;
end;
$$;

grant execute on function public.update_name(uuid, text) to anon;
