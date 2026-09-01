-- Already applied to the project via the Supabase MCP. Kept here for
-- reference / reruns elsewhere. Reflects the CURRENT deployed state.
--
-- Lets a signed-in member rename their team, or a signed-in mentor edit
-- their own display name, from their dashboard at any time. Both roles
-- share the same `app_users.name` column — for a member it holds the
-- team's name, for a mentor their personal name. Mentor names used to be
-- set once at self-registration with no way to fix a typo afterward (see
-- mentor_self_registration.sql, since closed); this reopens that as an
-- explicit, ongoing self-service edit instead.

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
  where id = p_user_id and role in ('member', 'mentor');

  return found;
end;
$$;

grant execute on function public.update_name(uuid, text) to anon;
